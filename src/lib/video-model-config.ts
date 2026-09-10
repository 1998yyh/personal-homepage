import type { VideoModelConfig } from '../types/ai-generation'

export function videoImageLimits(config: VideoModelConfig) {
  if (config.template === 'text') return { min: 0, max: 0 }
  if (config.template === 'first_last') return { min: 2, max: 2 }
  return { min: config.minImages ?? 1, max: config.maxImages ?? 9 }
}

export function videoRequirements(config?: VideoModelConfig): string {
  if (!config) return ''
  if (config.template === 'text') return '仅需提示词，不接受参考素材'
  if (config.template === 'first_last') return '需要 2 张图片，按添加顺序分别为首帧、尾帧'
  const { min, max } = videoImageLimits(config)
  return `需要 ${min === max ? min : `${min}–${max}`} 张参考图${config.template === 'lipsync' ? '和 1 段音频' : ''}`
}

/** 生成台和画布共用校验；切换模型后保留素材，明确提示用户调整。 */
export function validateVideoInput(
  config: VideoModelConfig | undefined,
  media: ReadonlyArray<{ kind: string }>,
  seconds?: string,
  resolution?: string,
  size?: string,
): string {
  if (!config) return ''
  if (size && !['auto', '16:9', '9:16', '1:1'].includes(size)) return '请选择支持的画面比例：自动、16:9、9:16、1:1'
  const { min, max } = videoImageLimits(config)
  const images = media.filter((m) => m.kind === 'image').length
  const audio = media.filter((m) => m.kind === 'audio').length
  if (config.template === 'text' && media.length) return videoRequirements(config)
  if (images < min || images > max) return videoRequirements(config)
  if (config.template === 'lipsync' ? audio !== 1 : audio > 0) return config.template === 'lipsync' ? videoRequirements(config) : '当前模型不接受音频，请移除音频素材'
  if (media.some((m) => !['image', 'audio'].includes(m.kind))) return '当前模型只接受指定的图片或音频素材'
  if (seconds) {
    const n = Number(seconds)
    if (!Number.isInteger(n) || n <= 0) return '视频时长必须为正整数'
    if (config.fixedSeconds && n !== config.fixedSeconds) return `当前模型时长固定为 ${config.fixedSeconds} 秒`
    const maxSeconds = config.maxSeconds ?? config.fixedSeconds ?? 15
    if (n > maxSeconds) return `当前模型最长支持 ${maxSeconds} 秒`
  }
  if (resolution && config.fixedResolution && resolution.toLowerCase() !== config.fixedResolution.toLowerCase()) return `当前模型清晰度固定为 ${config.fixedResolution}`
  if (resolution && config.resolutions?.length && !config.resolutions.some((r) => r.toLowerCase() === resolution.toLowerCase())) return `请选择支持的清晰度：${config.resolutions.join('、')}`
  return ''
}
