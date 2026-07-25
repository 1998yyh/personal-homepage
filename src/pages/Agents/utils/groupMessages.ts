import type { ChatMessage } from '../../../types/agent';

/** 归组后的工具调用卡片（入参 + 结果配对完成） */
export interface GroupedToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  content?: string;
  status: 'running' | 'done';
}

/** 统一渲染模型：一条用户/助手消息 + 内联工具卡片（实时流式与历史共用 ToolCallCard） */
export interface GroupedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls: GroupedToolCall[];
  totalTokens: number | null;
  createdAt: string;
}

/**
 * 历史消息归组：
 * - assistant 消息的 toolCalls 按 toolCallId 从 tool 消息中捞出结果，配对成卡片
 * - role='tool' 的消息不单独渲染（已被配对消费；孤儿 tool 消息也直接丢弃）
 * 输入要求按时间正序（ASC）。
 */
export function groupMessages(messages: ChatMessage[]): GroupedMessage[] {
  // toolCallId → 工具结果
  const toolResults = new Map<string, string>();
  for (const m of messages) {
    if (m.role === 'tool' && m.toolCallId) {
      toolResults.set(m.toolCallId, m.content);
    }
  }

  const grouped: GroupedMessage[] = [];
  for (const m of messages) {
    if (m.role === 'tool') continue; // 已被配对消费，不渲染独立气泡
    grouped.push({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: (m.toolCalls ?? []).map((c) => ({
        ...c,
        content: toolResults.get(c.id),
        status: 'done' as const,
      })),
      totalTokens: m.totalTokens,
      createdAt: m.createdAt,
    });
  }
  return grouped;
}
