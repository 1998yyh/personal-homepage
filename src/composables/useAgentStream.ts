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
 */
export function useAgentStream() {
  const status = ref<StreamStatus>('idle');
  const streamingMessage = ref<StreamingMessage | null>(null);
  const errorMessage = ref<string | null>(null);
  /** 记录最后一次发送内容，供「重试」原样重发 */
  let lastContent: string | null = null;

  const streaming = computed(() => status.value === 'streaming');

  let abortController: AbortController | null = null;

  /** 中断正在进行的流（切换会话/离开页面时调用） */
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
   * onMessageEnd 回调用于外部 invalidate 消息列表归位。
   */
  const send = async (
    conversationId: string,
    content: string,
    onMessageEnd?: (final: SseMessageEnd) => void,
  ) => {
    if (status.value === 'streaming') return; // 后端串行约束
    lastContent = content;
    status.value = 'streaming';
    errorMessage.value = null;
    streamingMessage.value = { text: '', toolCalls: [], totalTokens: null };

    abortController = new AbortController();
    // 已消费的响应文本偏移量（onDownloadProgress 每次给的是全量 responseText）
    let consumed = 0;
    let buffer = '';

    try {
      await api.post(
        `/conversations/${conversationId}/messages?stream=true`,
        { content },
        {
          signal: abortController.signal,
          onDownloadProgress: (event) => {
            const xhr = event.event?.currentTarget as XMLHttpRequest | undefined;
            const fullText: string = xhr?.responseText ?? '';
            buffer += fullText.slice(consumed);
            consumed = fullText.length;

            // 按 SSE 分隔符切完整事件，残余留 buffer 等下一段
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() ?? '';
            for (const chunk of chunks) {
              const error = handleChunk(chunk, streamingMessage.value!, onMessageEnd);
              if (error) {
                status.value = 'error';
                errorMessage.value = error;
                abortController?.abort();
                break;
              }
            }
          },
        },
      );

      // 正常结束：若状态还是 streaming（比如 message_end 未触发外部回调），兜底归位
      if (status.value === 'streaming') {
        status.value = 'done';
      }
    } catch (e) {
      // 主动 abort 不算错误
      if (abortController?.signal.aborted) return;
      status.value = 'error';
      errorMessage.value =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
        '网络异常，请稍后重试';
    } finally {
      abortController = null;
    }
  };

  /** 重试：原样重发上一条 content（后端落库时机后移，不会产生重复消息） */
  const retry = async (conversationId: string, onMessageEnd?: (final: SseMessageEnd) => void) => {
    if (lastContent == null) return;
    await send(conversationId, lastContent, onMessageEnd);
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
function handleChunk(
  chunk: string,
  msg: StreamingMessage,
  onMessageEnd?: (final: SseMessageEnd) => void,
): string | null {
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
        break; // 临时气泡已在 send 时创建
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
        // 以后端重建的最终消息为准，修正临时消息的拼接误差
        const d = data as SseMessageEnd;
        msg.text = d.content;
        msg.totalTokens = d.totalTokens;
        msg.toolCalls = (d.toolCalls ?? []).map((c) => ({
          ...c,
          content: msg.toolCalls.find((t) => t.id === c.id)?.content,
          status: 'done' as const,
        }));
        onMessageEnd?.(d);
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
