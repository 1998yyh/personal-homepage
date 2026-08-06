import api from './api';
import type {
  McpServer,
  McpServerListResponse,
  McpServerPayload,
  McpServerType,
} from '../types/mcp-server';

export const mcpServersApi = {
  /** 全局 MCP Server 列表（只返回启用中的；可按类型筛选） */
  list: async (type?: McpServerType) => {
    const { data } = await api.get<McpServerListResponse>('/mcp-servers', {
      params: type ? { type } : {},
    });
    return data;
  },

  create: async (payload: McpServerPayload) => {
    const { data } = await api.post<McpServer>('/mcp-servers', payload);
    return data;
  },

  /** 更新（仅创建者或管理员）；env/headers 不传则保持原值 */
  update: async (id: string, payload: Partial<McpServerPayload>) => {
    const { data } = await api.patch<McpServer>(`/mcp-servers/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/mcp-servers/${id}`);
  },
};

export default mcpServersApi;
