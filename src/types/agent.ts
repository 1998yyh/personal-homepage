// Agent 模块共享类型（对齐后端 tuanzi-server-base 的 agents 模块契约）

import type { ApiFormat } from './ai-generation'

/** 内置工具名（后端 tool-registry 注册，无列表接口，前端硬编码） */
export type BuiltinToolName = 'web_search' | 'calculator'

/** 内置工具中文名（展示用唯一来源：AgentsPage / ToolCallCard / AgentFormDrawer 共用，新增工具只改这一处） */
export const BUILTIN_TOOL_LABELS: Record<BuiltinToolName, string> = {
  web_search: '联网搜索',
  calculator: '计算器',
}

/** MCP Server 配置（v1 前端不暴露表单，仅类型占位） */
export interface McpServerConfig {
  name: string
  transport: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
}

/** Agent 配置（对话模型引用 ai-channels 渠道；后端返回渠道名/格式供展示） */
export interface Agent {
  id: string
  name: string
  description: string | null
  /** 对话模型所属渠道（ai-channels.id） */
  channelId: string
  /** 渠道名称（展示用，渠道异常时为 null） */
  channelName: string | null
  /** 渠道 API 格式（展示用） */
  apiFormat: ApiFormat | null
  /** 渠道下的对话模型名（capability=chat） */
  modelName: string
  systemPrompt: string | null
  maxTokens: number
  maxIterations: number
  enabledTools: string[]
  mcpServers: McpServerConfig[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 创建/更新 Agent 的提交载荷（连接凭据在渠道侧维护，这里只引用） */
export interface AgentPayload {
  name: string
  description?: string
  channelId: string
  modelName: string
  systemPrompt?: string
  maxTokens?: number
  maxIterations?: number
  enabledTools?: string[]
}

export interface Conversation {
  id: string
  /** 后端字段名是 agentConfigId（不是 agentId） */
  agentConfigId: string
  title: string | null
  status: 'active' | string
  createdAt: string
  updatedAt: string
}

export type MessageRole = 'user' | 'assistant' | 'tool'

export interface ToolCallRecord {
  id: string
  name: string
  args: Record<string, unknown>
}

/** 历史消息（GET /conversations/:id/messages，DESC 分页） */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  /** 仅 assistant：本轮工具调用入参 */
  toolCalls: ToolCallRecord[] | null
  /** 仅 tool：关联 assistant.toolCalls[].id */
  toolCallId: string | null
  /** 仅 assistant：token 消耗（存量数据为 null，不展示） */
  totalTokens: number | null
  createdAt: string
}

/** 后端统一分页响应形状 */
export interface PagedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ---- SSE 事件（POST /conversations/:id/messages?stream=true） ----

export interface SseMessageStart {
  role: 'assistant'
}

export interface SseTextDelta {
  text: string
}

export interface SseToolUse {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface SseToolResult {
  callId: string
  name: string
  content: string
}

export interface SseMessageEnd {
  /** 本轮 assistant 完整内容（中间轮/工具调用轮常为空串） */
  content: string
  toolCalls: ToolCallRecord[] | null
  /** 跨轮累计 token（input+output） */
  totalTokens: number
  conversationId: string
}

export interface SseError {
  message: string
}

export type SseEventType =
  | 'message_start'
  | 'text_delta'
  | 'tool_use'
  | 'tool_result'
  | 'message_end'
  | 'error'
