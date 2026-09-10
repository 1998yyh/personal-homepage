// 生成台表单参数枚举 + 状态标签：照抄画布 NodeConfigContent 的前端硬编码模式，
// 无后端元数据接口。所有 payload 参数字段均为 string（含 seconds/speed）。
import { GenerationTaskStatus, type ModelCapability } from '../../types/ai-generation'
import { AssetKind } from '../../types/asset'

// ---- 图片 ----
/** 尺寸芯片：标签是比例（用户心智），值是透传给 API 的 size 字符串。 */
export const IMAGE_SIZE_OPTIONS = [
  { value: 'auto', label: '自动', hint: '模型决定' },
  { value: '1024x1024', label: '1:1', hint: '方图' },
  { value: '1920x1080', label: '16:9', hint: '横屏 / 壁纸' },
  { value: '1080x1920', label: '9:16', hint: '竖屏 / 故事' },
  { value: '1536x1024', label: '3:2', hint: '相机横图' },
  { value: '1024x1536', label: '2:3', hint: '相机竖图' },
  { value: '1536x1152', label: '4:3', hint: '传统横图' },
  { value: '1152x1536', label: '3:4', hint: '传统竖图' },
] as const

export const IMAGE_SIZES = IMAGE_SIZE_OPTIONS.map((o) => o.value)
export const IMAGE_SIZE_DEFAULT = '1024x1024'

export function imageSizeLabel(value: string): string {
  return IMAGE_SIZE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export const IMAGE_QUALITY_OPTIONS = [
  { value: 'low', label: '草稿' },
  { value: 'medium', label: '标准' },
  { value: 'high', label: '高清' },
] as const

export const IMAGE_QUALITIES = IMAGE_QUALITY_OPTIONS.map((o) => o.value)

export function imageQualityLabel(value: string): string {
  return IMAGE_QUALITY_OPTIONS.find((o) => o.value === value)?.label ?? value
}

/** 芯片第一行：自动 / 1:1 / 16:9 / 9:16，其余进「更多」。 */
export const IMAGE_SIZE_PRIMARY = IMAGE_SIZE_OPTIONS.slice(0, 4)

// ---- 视频 ----
export const VIDEO_SIZE_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
] as const
export const VIDEO_SIZES = VIDEO_SIZE_OPTIONS.map((o) => o.value)

/** 比例芯片第一行：自动 / 16:9 / 9:16 / 1:1，其余进「更多」。 */
export const VIDEO_SIZE_PRIMARY = VIDEO_SIZE_OPTIONS.slice(0, 4)

/** 时长主档；空串「默认」和 -1「自动」收进更多，避免三个语义并列。 */
export const VIDEO_SECONDS_PRIMARY = ['5', '8', '10', '15'] as const
// 照抄画布 NodeConfigContent：含空串「默认」+ '-1' 自动，共 6 档
export const VIDEO_SECONDS = ['', '-1', '5', '8', '10', '15']
export const VIDEO_QUALITIES = ['480p', '720p', '1080p']

/** 比例示意矩形的最长边；长短边按真实比例缩进 20×20 视口。 */
const RATIO_GLYPH = 18

function parseAspect(size: string): [number, number] | null {
  if (!size || size === 'auto') return null
  const sep = size.includes('x') ? 'x' : size.includes(':') ? ':' : null
  if (!sep) return null
  const [w, h] = size.split(sep).map(Number)
  if (!w || !h) return null
  return [w, h]
}

/** 比例芯片旁的示意矩形（宽×高 px），适配 20×20 视口。auto 不走这里。 */
export function ratioBox(size: string): { w: number; h: number } {
  const parsed = parseAspect(size)
  if (!parsed) return { w: 10, h: 10 }
  const [rw, rh] = parsed
  const scale = RATIO_GLYPH / Math.max(rw, rh)
  return {
    w: Math.max(5, Math.round(rw * scale)),
    h: Math.max(5, Math.round(rh * scale)),
  }
}

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
export const AUDIO_FORMAT_PRIMARY = 'mp3'
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

/** 是否进行中（占位骨架） */
export function isPendingStatus(s: GenerationTaskStatus): boolean {
  return s === GenerationTaskStatus.Pending || s === GenerationTaskStatus.Processing
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
