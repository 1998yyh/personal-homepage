import type { ChatMessage } from '../../../types/agent';
import type { SubTrace } from '../../../composables/useAgentStream';

/** 归组后的工具调用卡片（入参 + 结果配对完成） */
export interface GroupedToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  content?: string;
  /** 历史只有 done/error；流式卡片（StreamingToolCall）经结构化赋值复用本类型，联合全量四态 */
  status: 'running' | 'done' | 'error' | 'interrupted';
  /** delegate_task 子代理实时轨迹（仅流式期间存在；历史卡片恒 undefined） */
  subTrace?: SubTrace;
}

/** 统一渲染模型：一条用户/助手消息 + 内联工具卡片（实时流式与历史共用 ToolCallCard） */
export interface GroupedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 推理模型的思考过程（仅 assistant，非推理模型为 null） */
  reasoning: string | null;
  toolCalls: GroupedToolCall[];
  totalTokens: number | null;
  createdAt: string;
}

/**
 * 历史消息归组：
 * - assistant 消息的 toolCalls 按 toolCallId 从 tool 消息中捞出结果，配对成卡片
 * - tool 消息带 isError 标记时，卡片状态为 error（红色失败态）
 * - role='tool' 的消息不单独渲染（已被配对消费；孤儿 tool 消息也直接丢弃）
 * 输入要求按时间正序（ASC）。
 */
export function groupMessages(messages: ChatMessage[]): GroupedMessage[] {
  // toolCallId → 工具结果（含失败标记）
  const toolResults = new Map<string, { content: string; isError: boolean }>();
  for (const m of messages) {
    if (m.role === 'tool' && m.toolCallId) {
      toolResults.set(m.toolCallId, { content: m.content, isError: m.isError });
    }
  }

  const grouped: GroupedMessage[] = [];
  for (const m of messages) {
    if (m.role === 'tool') continue; // 已被配对消费，不渲染独立气泡
    grouped.push({
      id: m.id,
      role: m.role,
      content: m.content,
      reasoning: m.reasoning,
      toolCalls: (m.toolCalls ?? []).map((c) => {
        const result = toolResults.get(c.id);
        return {
          ...c,
          content: result?.content,
          status: result?.isError ? ('error' as const) : ('done' as const),
        };
      }),
      totalTokens: m.totalTokens,
      createdAt: m.createdAt,
    });
  }
  return grouped;
}
