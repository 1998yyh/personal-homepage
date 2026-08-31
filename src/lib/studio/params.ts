// 生成台表单参数枚举 + 状态标签：照抄画布 NodeConfigContent 的前端硬编码模式，
// 无后端元数据接口。所有 payload 参数字段均为 string（含 seconds/speed）。
import { GenerationTaskStatus, type ModelCapability } from '../../types/ai-generation'
import { AssetKind } from '../../types/asset'

// ---- 图片 ----
export const IMAGE_SIZES = ['auto', '1024x1024', '1536x1024', '1024x1536']
export const IMAGE_QUALITIES = ['low', 'medium', 'high']

// ---- 视频 ----
export const VIDEO_SIZES = ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9']
// 照抄画布 NodeConfigContent：含空串「默认」+ '-1' 自动，共 6 档
export const VIDEO_SECONDS = ['', '-1', '5', '8', '10', '15']
export const VIDEO_QUALITIES = ['480p', '720p', '1080p']

/** 视频时长选项标签：空串=默认，-1=自动，其余=N 秒 */
export function videoSecondsLabel(s: string): string {
  if (s === '') return '默认'
  if (s === '-1') return '自动'
  return `${s} 秒`
}

// ---- 音频 ----
export const AUDIO_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable',
  'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
]
export const AUDIO_FORMATS = ['mp3', 'wav', 'opus', 'aac', 'flac', 'pcm']
export const AUDIO_SPEEDS = ['0.75', '1.0', '1.25', '1.5']

export const CAP_LABEL: Record<ModelCapability, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  chat: '对话',
}

export const STATUS_LABEL: Record<GenerationTaskStatus, string> = {
  [GenerationTaskStatus.Pending]: '排队中',
  [GenerationTaskStatus.Processing]: '生成中',
  [GenerationTaskStatus.Succeeded]: '已完成',
  [GenerationTaskStatus.Failed]: '失败',
  [GenerationTaskStatus.Cancelled]: '已取消',
}

/** 状态 chip 配色（成功=绿 / 失败·取消=红 / 进行中=橙） */
export function statusChipClass(s: GenerationTaskStatus): string {
  if (s === GenerationTaskStatus.Succeeded) return 'border-success/40 bg-success/10 text-success'
  if (s === GenerationTaskStatus.Failed || s === GenerationTaskStatus.Cancelled)
    return 'border-danger/40 bg-danger/10 text-danger'
  return 'border-warn/40 bg-warn/10 text-warn'
}

const TERMINAL = new Set<string>([
  GenerationTaskStatus.Succeeded,
  GenerationTaskStatus.Failed,
  GenerationTaskStatus.Cancelled,
])

/** 是否终态（轮询停止条件） */
export function isTerminal(status: string): boolean {
  return TERMINAL.has(status)
}

/** 是否失败态（失败或取消，走重试分支） */
export function isFailedStatus(s: GenerationTaskStatus): boolean {
  return s === GenerationTaskStatus.Failed || s === GenerationTaskStatus.Cancelled
}

/**
 * capability → 素材 kind 映射。
 * ⚠️ AssetKind 只有 text/image/video，无 audio——音频结果暂不支持存素材（返 null，
 * 隐藏存素材入口）。若要支持需后端 assets 模块加 audio kind。
 */
export function capabilityToAssetKind(cap: ModelCapability): AssetKind | null {
  if (cap === 'image') return AssetKind.Image
  if (cap === 'video') return AssetKind.Video
  return null
}
