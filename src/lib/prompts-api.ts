import api from './api'
import type {
  PromptListResponse,
  PromptSourcePayload,
  PromptSourceRefreshResult,
  PromptSourceRefreshSummary,
  PromptSourceStatus,
  PromptSourceView,
} from '../types/prompts'

export const promptsApi = {
  fetchPrompts: async (query: {
    keyword?: string
    /** 多个标签逗号分隔 */
    tag?: string
    category?: string
    page?: number
    pageSize?: number
  }) => {
    const { data } = await api.get<PromptListResponse>('/prompts', { params: query })
    return data
  },

  listSources: async () => {
    const { data } = await api.get<PromptSourceView[]>('/prompts/sources')
    return data
  },

  createSource: async (payload: PromptSourcePayload) => {
    const { data } = await api.post<PromptSourceView>('/prompts/sources', payload)
    return data
  },

  updateSource: async (id: string, payload: Partial<PromptSourcePayload & { isActive: boolean }>) => {
    const { data } = await api.patch<PromptSourceView>(`/prompts/sources/${id}`, payload)
    return data
  },

  removeSource: async (id: string) => {
    await api.delete(`/prompts/sources/${id}`)
  },

  fetchSourceStatuses: async () => {
    const { data } = await api.get<Record<string, PromptSourceStatus>>('/prompts/sources/statuses')
    return data
  },

  refreshSource: async (id: string) => {
    const { data } = await api.post<PromptSourceRefreshResult>(`/prompts/sources/${id}/refresh`)
    return data
  },

  refreshAllSources: async () => {
    const { data } = await api.post<PromptSourceRefreshSummary>('/prompts/refresh-all')
    return data
  },
}
