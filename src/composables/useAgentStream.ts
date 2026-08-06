import { computed, ref } from 'vue';
import api from '../lib/api';
import type {
  SseMessageEnd,
  SseTextDelta,
  SseToolResult,
  SseToolUse,
  ToolCallRecord,
} from '../types/agent';

/** 流式中的工具调用卡片状态 */
export interface StreamingToolCall extends ToolCallRecord {
  /** tool_result 回填的结果内容 */
  content?: string;
  status: 'running' | 'done';
}

/** 流式中的临时 assistant 消息（message_end 后以后端重建内容为准修正） */
export interface StreamingMessage {
  text: string;
  toolCalls: StreamingToolCall[];
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
  /** 记录最后一次发送内容，供「重试」原样重发 */
  let lastContent: string | null = null;

  const streaming = computed(() => status.value === 'streaming');

  let abortController: AbortController | null = null;

  /** 中断正在进行的流（切换会话/离开页面/点停止按钮时调用） */
  const abort = () => {
    abortController?.abort();
    abortController = null;
    if (status.value === 'streaming') {
      status.value = 'idle';
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
    streamingMessage.value = { text: '', toolCalls: [], totalTokens: null };

    // 局部持有 controller：abort() 会同步把闭包变量置 null，
    // 而 axios 的 rejection 在下一个微任务才到 catch——届时闭包变量已读不到 aborted 状态
    const controller = new AbortController();
    abortController = controller;
    // 已消费的响应文本偏移量（onDownloadProgress 每次给的是全量 responseText）
    let consumed = 0;
    let buffer = '';

    try {
      await api.post(
        `/conversations/${conversationId}/messages?stream=true`,
        { content },
        {
          signal: controller.signal,
          onDownloadProgress: (event) => {
            const xhr = event.event?.currentTarget as XMLHttpRequest | undefined;
            const fullText: string = xhr?.responseText ?? '';
            buffer += fullText.slice(consumed);
            consumed = fullText.length;

            // 按 SSE 分隔符切完整事件，残余留 buffer 等下一段
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() ?? '';
            for (const chunk of chunks) {
              const error = handleChunk(chunk, streamingMessage.value!);
              if (error) {
                status.value = 'error';
                errorMessage.value = error;
                controller.abort();
                break;
              }
            }
          },
        },
      );

      // 连接关闭且无 error = 流正常结束（多轮序列中最后一个 message_end 早已到达）
      if (status.value === 'streaming') {
        status.value = 'done';
        onStreamEnd?.();
      }
    } catch (e) {
      // 主动 abort 不算错误（含 SSE error 事件触发的内部断流）
      if (controller.signal.aborted) return;
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
  };

  return { status, streaming, streamingMessage, errorMessage, send, retry, abort, reset };
}

/** 解析单个 SSE 事件块（event: <type>\ndata: <json>）并更新临时消息；遇 error 事件返回错误信息 */
function handleChunk(chunk: string, msg: StreamingMessage): string | null {
  let eventType = '';
  let dataLine = '';
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) eventType = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
  }
  if (!eventType || !dataLine) return null;

  try {
    const data = JSON.parse(dataLine);
    switch (eventType) {
      case 'message_start':
        break; // 新一轮开始；临时气泡已在 send 时创建
      case 'text_delta':
        msg.text += (data as SseTextDelta).text;
        break;
      case 'tool_use': {
        const d = data as SseToolUse;
        msg.toolCalls.push({ id: d.id, name: d.name, args: d.args, status: 'running' });
        break;
      }
      case 'tool_result': {
        const d = data as SseToolResult;
        const call = msg.toolCalls.find((c) => c.id === d.callId);
        if (call) {
          call.content = d.content;
          call.status = 'done';
        }
        break;
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
        break;
      }
      case 'error':
        // 保留已生成文本，由 send 置 error 状态并断流，外部展示重试入口
        return (data as { message?: string }).message ?? 'Agent 执行异常，请稍后重试';
    }
  } catch {
    // 单个事件 JSON 解析失败不炸整个流，跳过
  }
  return null;
}
