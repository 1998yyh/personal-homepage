import api from './api'
import type { AiChannelView, ChannelPayload } from '../types/ai-generation'

export const channelsApi = {
  list: async () => {
    const { data } = await api.get<AiChannelView[]>('/ai-channels')
    return data
  },

  create: async (payload: ChannelPayload) => {
    const { data } = await api.post<AiChannelView>('/ai-channels', payload)
    return data
  },

  update: async (id: string, payload: Partial<ChannelPayload>) => {
    const { data } = await api.patch<AiChannelView>(`/ai-channels/${id}`, payload)
    return data
  },

  remove: async (id: string) => {
    await api.delete(`/ai-channels/${id}`)
  },
}

/** 模型选择值编码："channelId::modelName"（与后端 modelRef 契约一致） */
export function toModelRef(channelId: string, modelName: string): string {
  return `${channelId}::${modelName}`
}
