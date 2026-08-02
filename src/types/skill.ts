// Skill 模块共享类型（对齐后端 tuanzi-server-base 的 skills 模块契约）

/**
 * 可启用的内置工具名（后端 tool-names.ts 静态注册表，无列表接口，前端硬编码）。
 * 前两个为无状态工具，其余为 Agent 作用域工具。
 */
export type SkillBuiltinToolName =
  | 'web_search'
  | 'calculator'
  | 'create_scheduled_task'
  | 'write_daily_report'
  | 'list_scheduled_tasks'
  | 'delete_scheduled_task'

/** Skill 视图（响应形状：mcpServers 关系展开为 mcpServerIds） */
export interface Skill {
  id: string
  /** 工具名（LLM 调用时的 tool name，snake_case），全局唯一 */
  name: string
  description: string
  systemPrompt: string
  /** 入参 JSON Schema（本期前端不提供编辑，仅展示占位） */
  inputSchema: Record<string, unknown> | null
  enabledTools: string[] | null
  mcpServerIds: string[]
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** 创建/更新 Skill 的提交载荷 */
export interface SkillPayload {
  name: string
  description: string
  systemPrompt: string
  enabledTools?: string[]
  mcpServerIds?: string[]
}

/** 列表响应（后端不分页，一次返回全部启用中的 Skill） */
export interface SkillListResponse {
  items: Skill[]
  total: number
}
