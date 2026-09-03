// 生成台会话模型：一条生成记录 + composer 快照。
// 供 store / 历史栏 / 主区 / composer 共用。
import type { GenerationTaskStatus, ModelCapability } from '../../types/ai-generation'
import type { MediaFileView } from '../../types/media'

export type StudioCapability = Exclude<ModelCapability, 'chat'>

/** 发给 API / 从任务 params 还原的键值（size、quality、seconds 等） */
export type StudioParams = Record<string, unknown>

export interface StudioResult {
  /** 唯一 key（占位 ph-* 或 task.id） */
  key: string
  status: GenerationTaskStatus
  prompt: string
  /** 模型展示名（渠道 · 模型 或裸 modelName） */
  model: string
  /** 发给 API 的 modelRef，重试 / 还原用 */
  modelRef?: string
  /** 参数摘要，如 "1:1 · 标准" */
  metaSummary: string
  media: MediaFileView | null
  error: string | null
  /** 与 ?t=、轮询、hydrate 去重 */
  taskId?: string
  params: StudioParams
  referenceMedia?: MediaFileView[]
  /** 占位插入或任务 createdAt，进行中显示已用秒数 */
  startedAt: number
}

export interface StudioComposer {
  prompt: string
  modelRef?: string
  imageSize: string
  imageQuality: string
  videoSeconds: string
  videoSize: string
  videoQuality: string
  audioVoice: string
  audioFormat: string
  audioSpeed: string
  referenceMedia: MediaFileView[]
  formError: string
}

export interface StudioSession {
  composer: StudioComposer
  items: StudioResult[]
  /** null = 「新的一次」，主区居中 composer、不展示结果 */
  selectedKey: string | null
  /** 该能力是否已拉过第一页任务；防点「+」后被 hydrate 再选中最近一条 */
  hydrated: boolean
  listPage: number
  listHasMore: boolean
}
