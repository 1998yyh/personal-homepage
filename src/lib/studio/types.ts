// 生成台结果流的展示模型：统一同步返回的 media 与异步 task 轮询结果，
// 供 StudioGeneratePane 与 ResultCard 共用。
import type { GenerationTaskStatus } from '../../types/ai-generation'
import type { MediaFileView } from '../../types/media'

export interface StudioResult {
  /** 唯一 key（media.id 或 task.id） */
  key: string
  status: GenerationTaskStatus
  prompt: string
  /** 模型展示名（渠道 · 模型 或裸 modelName） */
  model: string
  /** 参数摘要，如 "1024x1024 · high" */
  metaSummary: string
  /** 结果媒体（成功后回填；pending/failed 为 null） */
  media: MediaFileView | null
  error: string | null
  /** 视频异步任务 id（轮询用；同步能力为空） */
  taskId?: string
}
