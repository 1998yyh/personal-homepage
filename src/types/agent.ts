// Agent 模块共享类型（对齐后端 tuanzi-server-base 的 agents 模块契约）

/** LLM 供应商（deepseek 后端暂未支持，前端表单禁用） */
export type AgentProvider = 'anthropic' | 'openai' | 'deepseek'

/** 内置工具名（后端 tool-registry 注册，无列表接口，前端硬编码） */
export type BuiltinToolName = 'web_search' | 'calculator'

/** MCP Server 配置（v1 前端不暴露表单，仅类型占位） */
export interface McpServerConfig {
  name: string
  transport: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
}

/** Agent 配置（响应形状：apiKey 脱敏为 apiKeyMasked） */
export interface Agent {
  id: string
  name: string
  description: string | null
  provider: AgentProvider
  model: string
  apiKeyMasked: string
  baseUrl: string | null
  systemPrompt: string | null
  maxTokens: number
  maxIterations: number
  enabledTools: string[]
  mcpServers: McpServerConfig[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 创建/更新 Agent 的提交载荷（更新时 apiKey 不传表示保持原值） */
export interface AgentPayload {
  name: string
  description?: string
  provider: AgentProvider
  model: string
  apiKey?: string
  baseUrl?: string
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
