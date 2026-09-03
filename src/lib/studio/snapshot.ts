// 生成台 composer ↔ 任务 params / StudioResult 互转。
import { toModelRef } from '../channels-api'
import { GenerationTaskStatus, type GenerationTaskView } from '../../types/ai-generation'
import type { MediaFileView } from '../../types/media'
import {
  imageQualityLabel,
  imageSizeLabel,
  videoSecondsLabel,
} from './params'
import type { StudioCapability, StudioComposer, StudioParams, StudioResult } from './types'

function str(value: unknown, fallback: string): string {
  if (value == null || value === '') return fallback
  return String(value)
}

export function refIdsFromParams(params: StudioParams): string[] {
  const raw = params.referenceMediaIds
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

/** 图片 size 是像素串，视频 size 是比例串，同名字段语义不同，按 capability 分支。 */
export function composerToParams(capability: StudioCapability, c: StudioComposer): StudioParams {
  const refIds = c.referenceMedia.map((m) => m.id)
  const refs = refIds.length ? { referenceMediaIds: refIds } : {}
  if (capability === 'image') return { size: c.imageSize, quality: c.imageQuality, ...refs }
  if (capability === 'video') {
    return { seconds: c.videoSeconds, size: c.videoSize, vquality: c.videoQuality, ...refs }
  }
  return { voice: c.audioVoice, format: c.audioFormat, speed: c.audioSpeed }
}

export function metaSummaryFromParams(capability: StudioCapability, params: StudioParams): string {
  if (capability === 'image') {
    return `${imageSizeLabel(str(params.size, '1024x1024'))} · ${imageQualityLabel(str(params.quality, 'medium'))}`
  }
  if (capability === 'video') {
    return `${videoSecondsLabel(str(params.seconds, '5'))} · ${str(params.size, 'auto')} · ${str(params.vquality, '720p')}`
  }
  return `${str(params.voice, 'alloy')} · ${str(params.format, 'mp3')} · ${str(params.speed, '1.0')}x`
}

export function applyParamsToComposer(
  capability: StudioCapability,
  c: StudioComposer,
  params: StudioParams,
  refs?: MediaFileView[],
) {
  if (capability === 'image') {
    c.imageSize = str(params.size, c.imageSize)
    c.imageQuality = str(params.quality, c.imageQuality)
  } else if (capability === 'video') {
    c.videoSeconds = str(params.seconds, c.videoSeconds)
    c.videoSize = str(params.size, c.videoSize)
    c.videoQuality = str(params.vquality, c.videoQuality)
  } else {
    c.audioVoice = str(params.voice, c.audioVoice)
    c.audioFormat = str(params.format, c.audioFormat)
    c.audioSpeed = str(params.speed, c.audioSpeed)
  }
  if (refs) c.referenceMedia = refs
}

export function applyResultToComposer(capability: StudioCapability, c: StudioComposer, item: StudioResult) {
  c.prompt = item.prompt
  c.modelRef = item.modelRef
  c.formError = ''
  // 参考图拷贝一份，后续在槽里增删不影响这条历史快照。
  applyParamsToComposer(capability, c, item.params, item.referenceMedia ? [...item.referenceMedia] : [])
}

export function taskToStudioResult(task: GenerationTaskView): StudioResult {
  const params: StudioParams = { ...(task.params ?? {}) }
  const cap = task.capability as StudioCapability
  return {
    key: task.id,
    status: task.status,
    prompt: task.prompt,
    model: task.model,
    modelRef: toModelRef(task.channelId, task.model),
    metaSummary: metaSummaryFromParams(cap, params),
    media: task.resultMedia,
    error: task.error,
    taskId: task.id,
    params,
    startedAt: Date.parse(task.createdAt) || Date.now(),
  }
}

export function composerToResultDraft(
  capability: StudioCapability,
  c: StudioComposer,
  modelLabel: string,
  key: string,
): StudioResult {
  const params = composerToParams(capability, c)
  return {
    key,
    status: GenerationTaskStatus.Processing,
    prompt: c.prompt,
    model: modelLabel,
    modelRef: c.modelRef,
    metaSummary: metaSummaryFromParams(capability, params),
    media: null,
    error: null,
    params,
    referenceMedia: c.referenceMedia.map((m) => m), // 拷贝，避免占位卡和输入框共享同一数组引用。
    startedAt: Date.now(),
  }
}
