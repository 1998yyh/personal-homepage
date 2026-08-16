import api from './api';
import type {
  Agent,
  AgentPayload,
  BackgroundTask,
  ChatMessage,
  Conversation,
  PagedResponse,
} from '../types/agent';
import type { McpServer } from '../types/mcp-server';
import type { Skill } from '../types/skill';

// 分页常量（设计文档 §10：Agent 一次拉全 / 会话滚动加载 / 消息向上翻页）
export const AGENTS_LIMIT = 100;
export const CONVERSATIONS_LIMIT = 20;
export const MESSAGES_LIMIT = 30;

export const agentsApi = {
  // ---- Agent CRUD ----
  list: async (page = 1) => {
    const { data } = await api.get<PagedResponse<Agent>>('/agents', {
      params: { page, limit: AGENTS_LIMIT },
    });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<Agent>(`/agents/${id}`);
    return data;
  },

  create: async (payload: AgentPayload) => {
    const { data } = await api.post<Agent>('/agents', payload);
    return data;
  },

  update: async (id: string, payload: Partial<AgentPayload>) => {
    const { data } = await api.patch<Agent>(`/agents/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/agents/${id}`);
  },

  // ---- 会话 ----
  listConversations: async (agentId: string, page = 1) => {
    const { data } = await api.get<PagedResponse<Conversation>>(`/agents/${agentId}/conversations`, {
      params: { page, limit: CONVERSATIONS_LIMIT },
    });
    return data;
  },

  createConversation: async (agentId: string) => {
    const { data } = await api.post<Conversation>(`/agents/${agentId}/conversations`, {});
    return data;
  },

  removeConversation: async (id: string) => {
    await api.delete(`/conversations/${id}`);
  },

  // ---- Agent 关联：MCP Server / Skill（整体替换语义） ----
  getMcpServers: async (agentId: string) => {
    const { data } = await api.get<McpServer[]>(`/agents/${agentId}/mcp-servers`);
    return data;
  },

  updateMcpServers: async (agentId: string, mcpServerIds: string[]) => {
    const { data } = await api.put<McpServer[]>(`/agents/${agentId}/mcp-servers`, { mcpServerIds });
    return data;
  },

  getSkills: async (agentId: string) => {
    const { data } = await api.get<Skill[]>(`/agents/${agentId}/skills`);
    return data;
  },

  updateSkills: async (agentId: string, skillIds: string[]) => {
    const { data } = await api.put<Skill[]>(`/agents/${agentId}/skills`, { skillIds });
    return data;
  },

  /** 消息历史：后端 DESC 分页，page=1 为最新一页 */
  listMessages: async (conversationId: string, page = 1) => {
    const { data } = await api.get<PagedResponse<ChatMessage>>(`/conversations/${conversationId}/messages`, {
      params: { page, limit: MESSAGES_LIMIT },
    });
    return data;
  },

  /** 会话的后台任务列表（最新在前，头部 pill 轮询用） */
  listBackgroundTasks: async (conversationId: string) => {
    const { data } = await api.get<BackgroundTask[]>(
      `/conversations/${conversationId}/background-tasks`,
    );
    return data;
  },
};

export default agentsApi;
