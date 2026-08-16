import { computed, ref } from 'vue';
import api from '../lib/api';
import type {
  SseMessageEnd,
  SseReasoningDelta,
  SseSubEvent,
  SseTextDelta,
  SseToolResult,
  SseToolUse,
  ToolCallRecord,
} from '../types/agent';

/** delegate_task 子代理的实时轨迹（仅流式期间存在，刷新后不可见——刻意裁剪） */
export interface SubTrace {
  reasoning: string;
  text: string;
  toolCalls: StreamingToolCall[];
}

/** 流式中的工具调用卡片状态 */
export interface StreamingToolCall extends ToolCallRecord {
  /** tool_result 回填的结果内容 */
  content?: string;
  status: 'running' | 'done' | 'error' | 'interrupted';
  /** 子代理轨迹（delegate_task 卡片专属） */
  subTrace?: SubTrace;
}

/** 流式中的临时 assistant 消息（message_end 后以后端重建内容为准修正） */
export interface StreamingMessage {
  text: string;
  /** 推理模型的思考过程（reasoning_delta 跨轮累计） */
  reasoning: string;
  toolCalls: StreamingToolCall[];
  totalTokens: number | null;
}

/** 一轮对话的耗时指标（纯前端计时，流结束时结算；tok/s 按 totalTokens 含输入，是近似值） */
export interface TurnMetrics {
  elapsedMs: number;
  /** 首 token 时间（send → 首个 text_delta/reasoning_delta/tool_use/sub_event） */
  ttftMs: number | null;
  totalTokens: number | null;
}

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

/**
 * SSE 流式对话 composable。
 * 用 axios onDownloadProgress 增量解析 XHR 响应文本——
 * 白嫖共享实例的 token 注入与 401 刷新，不另起 fetch（CLAUDE.md 禁令）。
 *
 * 后端真实事件序列是多轮的（ReAct 每轮迭代一对 message_start/message_end，
 * tool_use/tool_result 发生在 message_end 之后）：
 *   message_start → text_delta* → message_end → (tool_use → tool_result)* → message_start → … → 流关闭
 * 因此 message_end 只用于修正本轮内容，**不是流结束信号**；
 * 流结束以 axios 请求完成（连接关闭）为准，此时才触发 onStreamEnd 归位。
 */
export function useAgentStream() {
  const status = ref<StreamStatus>('idle');
  const streamingMessage = ref<StreamingMessage | null>(null);
  const errorMessage = ref<string | null>(null);
  /** 刚结束那轮的耗时指标（done 时结算；下次 send 清空，reset 不清——页面先取走再 reset） */
  const turnMetrics = ref<TurnMetrics | null>(null);
  /** 记录最后一次发送内容，供「重试」原样重发 */
  let lastContent: string | null = null;
  /** 本轮发送锚点 / 首个内容事件时间（TTFT 用） */
  let sendAt = 0;
  let firstDeltaAt: number | null = null;

  const streaming = computed(() => status.value === 'streaming');

  let abortController: AbortController | null = null;

  // ── rAF 合帧发布（对齐 deepseek-harness 的 markFrameDirty） ──────
  // delta 先进非响应式草稿，每帧最多同步一次到 reactive streamingMessage，
  // 避免每个网络 chunk 都触发整条响应式链路（watch + 组件重渲染）。
  let draft: StreamingMessage | null = null;
  let frameId: number | null = null;

  const publish = () => {
    frameId = null;
    if (!draft || !streamingMessage.value) return;
    streamingMessage.value.text = draft.text;
    streamingMessage.value.reasoning = draft.reasoning;
    // 工具卡片数组整体换新，ToolCallCard 按帧重渲；
    // subTrace 两层深拷贝是承重的——浅拷贝会让嵌套轨迹在响应式层原地突变不触发更新
    streamingMessage.value.toolCalls = draft.toolCalls.map((c) => ({
      ...c,
      subTrace: c.subTrace
        ? { ...c.subTrace, toolCalls: c.subTrace.toolCalls.map((x) => ({ ...x })) }
        : undefined,
    }));
    streamingMessage.value.totalTokens = draft.totalTokens;
  };

  const schedulePublish = () => {
    if (frameId == null) frameId = requestAnimationFrame(publish);
  };

  /** 立即冲刷挂起的发布（流结束/出错/中断前调用，避免丢尾部 delta） */
  const flushPublish = () => {
    if (frameId != null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    publish();
  };

  /**
   * 中断正在进行的流（切换会话/离开页面/点停止按钮时调用）。
   * keepPartial=true（停止生成）：先把仍 running 的卡片定格为 interrupted 并保留
   * 残影气泡，由调用方在消息列表归位后 reset 清掉——用户能看到「已中断」而非凭空消失。
   */
  const abort = (opts?: { keepPartial?: boolean }) => {
    if (frameId != null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    const keep = !!opts?.keepPartial && status.value === 'streaming';
    if (keep && draft) {
      markInterrupted(draft.toolCalls); // 递归含嵌套 subTrace
      flushPublish();
    }
    abortController?.abort();
    abortController = null;
    if (status.value === 'streaming') status.value = 'idle';
    // 非保留路径无条件清残影：停止生成后 status 已是 idle，
    // 此时切换会话/草稿若只在 streaming 分支清理，残影会漏到新视图
    if (!keep) {
      draft = null;
      streamingMessage.value = null;
    }
  };

  /**
   * 发送消息并开始流式接收。
   * onStreamEnd 在流真正结束（连接关闭且无 error）时触发，
   * 用于外部 invalidate 消息列表归位。
   */
  const send = async (
    conversationId: string,
    content: string,
    onStreamEnd?: () => void,
  ) => {
    if (status.value === 'streaming') return; // 后端串行约束
    lastContent = content;
    status.value = 'streaming';
    errorMessage.value = null;
    turnMetrics.value = null;
    sendAt = performance.now();
    firstDeltaAt = null;
    draft = { text: '', reasoning: '', toolCalls: [], totalTokens: null };
    streamingMessage.value = { text: '', reasoning: '', toolCalls: [], totalTokens: null };

    // 局部持有 controller：abort() 会同步把闭包变量置 null，
    // 而 axios 的 rejection 在下一个微任务才到 catch——届时闭包变量已读不到 aborted 状态
    const controller = new AbortController();
    abortController = controller;
    // 已消费的响应文本偏移量（progress 事件里读的是全量 responseText）
    let consumed = 0;
    let buffer = '';
    let capturedXhr: XMLHttpRequest | null = null;

    /** 消费响应文本增量：切 SSE 事件写入草稿，调度合帧发布 */
    const consume = () => {
      const xhr = capturedXhr;
      if (!xhr) return;
      const fullText: string = xhr.responseText ?? '';
      if (fullText.length <= consumed) return;
      buffer += fullText.slice(consumed);
      consumed = fullText.length;

      // 按 SSE 分隔符切完整事件，残余留 buffer 等下一段
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        // 事件写入非响应式草稿，统一由 rAF 合帧发布
        const { error, delta } = handleChunk(chunk, draft!);
        if (delta && firstDeltaAt == null) firstDeltaAt = performance.now();
        if (error) {
          markInterrupted(draft!.toolCalls); // 未完成的卡片定格为中断态
          flushPublish();
          status.value = 'error';
          errorMessage.value = error;
          controller.abort();
          break;
        }
      }
      schedulePublish();
    };

    try {
      await api.post(
        `/conversations/${conversationId}/messages?stream=true`,
        { content },
        {
          signal: controller.signal,
          onDownloadProgress: (event) => {
            // ⚠️ 必须用 event.target 而非 currentTarget：axios 的 progressEventReducer
            // 把该回调节流到 3 次/秒，延迟触发时原生事件的 currentTarget 已被置 null
            // （DOM 规范：dispatch 结束后清空），target 则始终有效。
            const xhr = (event.event?.target ?? event.event?.currentTarget) as
              | XMLHttpRequest
              | undefined;
            if (!xhr) return;
            if (capturedXhr !== xhr) {
              capturedXhr = xhr;
              // axios 回调自身只有 3 次/秒，另挂原始 progress listener 拿全频率增量
              xhr.addEventListener('progress', consume);
            }
            consume();
          },
        },
      );

      // 连接关闭且无 error = 流正常结束（多轮序列中最后一个 message_end 早已到达）
      if (status.value === 'streaming') {
        flushPublish(); // 冲刷末帧，避免丢尾部 delta
        status.value = 'done';
        turnMetrics.value = {
          elapsedMs: performance.now() - sendAt,
          ttftMs: firstDeltaAt != null ? firstDeltaAt - sendAt : null,
          totalTokens: draft?.totalTokens ?? null,
        };
        onStreamEnd?.();
      }
    } catch (e) {
      // 主动 abort 不算错误（含 SSE error 事件触发的内部断流）
      if (controller.signal.aborted) return;
      if (draft) markInterrupted(draft.toolCalls); // 未完成的卡片定格为中断态
      flushPublish(); // 保留已生成文本
      status.value = 'error';
      errorMessage.value =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
        '网络异常，请稍后重试';
    } finally {
      if (abortController === controller) abortController = null;
    }
  };

  /** 重试：原样重发上一条 content（后端落库时机后移，不会产生重复消息） */
  const retry = async (conversationId: string, onStreamEnd?: () => void) => {
    if (lastContent == null) return;
    await send(conversationId, lastContent, onStreamEnd);
  };

  /** 流归位后清理临时状态，回 idle */
  const reset = () => {
    status.value = 'idle';
    streamingMessage.value = null;
    errorMessage.value = null;
    draft = null;
  };

  return { status, streaming, streamingMessage, errorMessage, turnMetrics, send, retry, abort, reset };
}

/** 把仍 running 的工具卡片（含子代理嵌套）定格为 interrupted（error/断流路径用） */
function markInterrupted(calls: StreamingToolCall[]): void {
  for (const c of calls) {
    if (c.status === 'running') c.status = 'interrupted';
    if (c.subTrace) markInterrupted(c.subTrace.toolCalls);
  }
}

interface ChunkOutcome {
  /** SSE error 事件的错误信息（非 null 时由 send 置 error 状态并断流） */
  error: string | null;
  /** 是否内容类事件（首个内容事件的时间 = TTFT 锚点） */
  delta: boolean;
}

const NO_DELTA: ChunkOutcome = { error: null, delta: false };

/** 解析单个 SSE 事件块（event: <type>\ndata: <json>）并更新临时消息 */
function handleChunk(chunk: string, msg: StreamingMessage): ChunkOutcome {
  let eventType = '';
  let dataLine = '';
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) eventType = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
  }
  if (!eventType || !dataLine) return NO_DELTA;

  try {
    const data = JSON.parse(dataLine);
    switch (eventType) {
      case 'message_start':
        return NO_DELTA; // 新一轮开始；临时气泡已在 send 时创建
      case 'text_delta':
        msg.text += (data as SseTextDelta).text;
        return { error: null, delta: true };
      case 'reasoning_delta':
        // 推理模型的思考过程：跨轮累计（与正文分列展示）
        msg.reasoning += (data as SseReasoningDelta).text;
        return { error: null, delta: true };
      case 'tool_use': {
        const d = data as SseToolUse;
        msg.toolCalls.push({ id: d.id, name: d.name, args: d.args, status: 'running' });
        return { error: null, delta: true };
      }
      case 'tool_result': {
        const d = data as SseToolResult;
        const call = msg.toolCalls.find((c) => c.id === d.callId);
        if (call) {
          call.content = d.content;
          call.status = d.isError ? 'error' : 'done';
        }
        return NO_DELTA;
      }
      case 'sub_event': {
        // delegate_task 子代理的内部事件：按父工具调用 id 归组进 subTrace。
        // 未知 callId 防御性忽略（顺序上 sub_event 必在父 tool_use 之后，兜底用）。
        const d = data as SseSubEvent;
        const call = msg.toolCalls.find((c) => c.id === d.callId);
        if (!call) return NO_DELTA;
        call.subTrace ??= { reasoning: '', text: '', toolCalls: [] };
        routeSubEvent(call.subTrace, d);
        return { error: null, delta: true };
      }
      case 'message_end': {
        // 本轮定稿（多轮序列中每轮一次，不是流结束信号）：
        // content 为该轮 assistant 完整内容——中间轮（工具调用轮）常为空串，
        // 仅非空时覆盖，最终一轮的 content 即最终回答
        const d = data as SseMessageEnd;
        if (d.content) msg.text = d.content;
        msg.totalTokens = d.totalTokens;
        // 兜底补齐 tool_use 事件里可能漏掉的卡片；已存在的保留流式期回填的 content
        for (const c of d.toolCalls ?? []) {
          if (!msg.toolCalls.some((t) => t.id === c.id)) {
            msg.toolCalls.push({ ...c, status: 'done' });
          }
        }
        return NO_DELTA;
      }
      case 'error':
        // 保留已生成文本，由 send 置 error 状态并断流，外部展示重试入口
        return {
          error: (data as { message?: string }).message ?? 'Agent 执行异常，请稍后重试',
          delta: false,
        };
    }
  } catch {
    // 单个事件 JSON 解析失败不炸整个流，跳过
  }
  return NO_DELTA;
}

/** sub_event 内层事件路由：与顶层同规则，写进父卡片的 subTrace */
function routeSubEvent(sub: SubTrace, event: SseSubEvent): void {
  const inner = event.data as Record<string, unknown>;
  switch (event.type) {
    case 'text_delta':
      sub.text += (inner as unknown as SseTextDelta).text;
      break;
    case 'reasoning_delta':
      sub.reasoning += (inner as unknown as SseReasoningDelta).text;
      break;
    case 'tool_use': {
      const t = inner as unknown as SseToolUse;
      sub.toolCalls.push({ id: t.id, name: t.name, args: t.args, status: 'running' });
      break;
    }
    case 'tool_result': {
      const t = inner as unknown as SseToolResult;
      const tc = sub.toolCalls.find((c) => c.id === t.callId);
      if (tc) {
        tc.content = t.content;
        tc.status = t.isError ? 'error' : 'done';
      }
      break;
    }
    case 'message_end': {
      // 子代理本轮定稿：仅非空时覆盖（与顶层 message_end 语义一致）
      const t = inner as unknown as SseMessageEnd;
      if (t.content) sub.text = t.content;
      break;
    }
    // message_start 无需处理
  }
}
