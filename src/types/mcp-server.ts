// MCP Server 模块共享类型（对齐后端 tuanzi-server-base 的 mcp-servers 模块契约）

/** MCP 连接类型。stdio 在服务端执行子进程，仅管理员可创建/编辑 */
export type McpServerType = 'stdio' | 'sse' | 'streamable-http'

/** MCP Server 视图（响应形状：env/headers 为敏感配置，后端不回显） */
export interface McpServer {
  id: string
  name: string
  type: McpServerType
  /** stdio 专用 */
  command: string | null
  args: string[] | null
  /** sse / streamable-http 专用 */
  url: string | null
  description: string | null
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** 创建/更新 MCP Server 的提交载荷（更新时 env/headers 不传表示保持原值） */
export interface McpServerPayload {
  name: string
  type: McpServerType
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  description?: string
}

/** 列表响应（后端不分页，一次返回全部启用中的 server） */
export interface McpServerListResponse {
  items: McpServer[]
  total: number
}
