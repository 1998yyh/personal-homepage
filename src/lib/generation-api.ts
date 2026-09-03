import api from './api'
import type {
  GenerateAudioPayload,
  GenerateImagePayload,
  GenerateVideoPayload,
  GenerationTaskListResponse,
  GenerationTaskView,
  ModelCapability,
  GenerationTaskStatus,
} from '../types/ai-generation'
import type { MediaFileView } from '../types/media'

export const generationApi = {
  /** 图片生成（同步）：返回任务 + 落盘的媒体列表 */
  generateImage: async (payload: GenerateImagePayload) => {
    const { data } = await api.post<{ task: GenerationTaskView; media: MediaFileView[] }>(
      '/ai-generation/images',
      payload,
    )
    return data
  },

  /** 视频生成（异步）：立即返回任务，前端轮询 getTask 直至终态 */
  generateVideo: async (payload: GenerateVideoPayload) => {
    const { data } = await api.post<{ task: GenerationTaskView }>('/ai-generation/videos', payload)
    return data
  },

  /** 音频生成（同步） */
  generateAudio: async (payload: GenerateAudioPayload) => {
    const { data } = await api.post<{ task: GenerationTaskView; media: MediaFileView }>(
      '/ai-generation/audios',
      payload,
    )
    return data
  },

  listTasks: async (query: {
    page?: number
    limit?: number
    capability?: ModelCapability
    status?: GenerationTaskStatus
  }) => {
    const { data } = await api.get<GenerationTaskListResponse>('/ai-generation/tasks', {
      params: query,
    })
    return data
  },

  getTask: async (id: string) => {
    const { data } = await api.get<GenerationTaskView>(`/ai-generation/tasks/${id}`)
    return data
  },

  /** 删除任务记录。走 POST …/delete（不用 HTTP DELETE）；只删任务行，不删结果媒体。 */
  removeTask: async (id: string) => {
    await api.post(`/ai-generation/tasks/${id}/delete`)
  },
}
