// 生成台跨能力会话：composer + 历史栏 items + 选中项。
// 页面只编排；切图片/视频/音频不丢状态。
import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { GenerationTaskStatus } from '../types/ai-generation'
import type { MediaFileView } from '../types/media'
import {
  AUDIO_VOICES,
  IMAGE_SIZE_DEFAULT,
  VIDEO_QUALITIES,
  VIDEO_SIZES,
  isTerminal,
} from '../lib/studio/params'
import { applyResultToComposer } from '../lib/studio/snapshot'
import type { StudioCapability, StudioComposer, StudioResult, StudioSession } from '../lib/studio/types'

const CAPS: StudioCapability[] = ['image', 'video', 'audio']

function emptyComposer(): StudioComposer {
  return {
    prompt: '',
    modelRef: undefined,
    imageSize: IMAGE_SIZE_DEFAULT,
    imageQuality: 'medium',
    videoSeconds: '5',
    videoSize: VIDEO_SIZES[0],
    videoQuality: VIDEO_QUALITIES[1],
    audioVoice: AUDIO_VOICES[0],
    audioFormat: 'mp3',
    audioSpeed: '1.0',
    referenceMedia: [],
    formError: '',
  }
}

function emptySession(): StudioSession {
  return {
    composer: emptyComposer(),
    items: [],
    selectedKey: null,
    hydrated: false,
    listPage: 0,
    listHasMore: true,
  }
}

// 占位 key 用模块计数、三套会话共用，避免切能力后都从 0 起导致 ph-0 撞车。
let placeholderSeq = 0

export const useStudioStore = defineStore('studio', () => {
  // 图片 / 视频 / 音频各一份会话：切顶栏 Tab 只换 capability，不整树销毁。
  const sessions = reactive<Record<StudioCapability, StudioSession>>({
    image: emptySession(),
    video: emptySession(),
    audio: emptySession(),
  })
  const preview = ref<{ capability: StudioCapability; key: string } | null>(null)

  function session(capability: StudioCapability): StudioSession {
    return sessions[capability]
  }

  function selectedItem(capability: StudioCapability): StudioResult | null {
    const s = sessions[capability]
    if (!s.selectedKey) return null
    return s.items.find((i) => i.key === s.selectedKey) ?? null
  }

  const previewItem = computed(() => {
    if (!preview.value) return null
    const { capability, key } = preview.value
    return sessions[capability].items.find((i) => i.key === key) ?? null
  })

  function pendingCount(capability: StudioCapability): number {
    return sessions[capability].items.filter((i) => !isTerminal(i.status)).length
  }

  function selectItem(capability: StudioCapability, key: string) {
    const s = sessions[capability]
    const item = s.items.find((i) => i.key === key)
    if (!item) return
    s.selectedKey = key
    // 点历史 tab = 整份还原；composer 里没发出去的改动直接丢（产品拍板不弹确认）。
    applyResultToComposer(capability, s.composer, item)
  }

  function startDraft(capability: StudioCapability) {
    const s = sessions[capability]
    s.selectedKey = null
    // 「新的一次」只清 prompt / 参考图，模型与尺寸等规格留下当工作台默认。
    s.composer.prompt = ''
    s.composer.referenceMedia = []
    s.composer.formError = ''
  }

  function ensureModel(capability: StudioCapability, modelRef: string) {
    const c = sessions[capability].composer
    if (!c.modelRef) c.modelRef = modelRef
  }

  function setFormError(capability: StudioCapability, message: string) {
    sessions[capability].composer.formError = message
  }

  function addReference(capability: StudioCapability, media: MediaFileView) {
    const list = sessions[capability].composer.referenceMedia
    if (list.some((x) => x.id === media.id)) return
    list.push(media)
  }

  function setComposerRefs(capability: StudioCapability, media: MediaFileView[]) {
    sessions[capability].composer.referenceMedia = media
  }

  /** 发请求前先插「生成中」占位并选中，右侧立刻有反馈；key 用 ph-* 与真实 taskId 区分。 */
  function pushPlaceholder(capability: StudioCapability, draft: StudioResult): string {
    const key = `ph-${placeholderSeq++}`
    const item: StudioResult = { ...draft, key }
    const s = sessions[capability]
    s.items.unshift(item)
    s.selectedKey = key
    s.composer.formError = ''
    return key
  }

  /** 失败重试用：同一条 tab 改回生成中，不新开栏位。 */
  function reuseAsPlaceholder(capability: StudioCapability, key: string, draft: StudioResult): string | null {
    const s = sessions[capability]
    const item = s.items.find((i) => i.key === key)
    if (!item) return null
    Object.assign(item, draft, {
      key,
      status: GenerationTaskStatus.Processing,
      media: null,
      error: null,
      startedAt: Date.now(),
    })
    // 清掉旧 taskId，否则 2s 轮询还会打已准备删掉的失败任务。
    delete item.taskId
    s.selectedKey = key
    s.composer.formError = ''
    return key
  }

  function replacePlaceholder(capability: StudioCapability, phKey: string, next: StudioResult[]): boolean {
    const s = sessions[capability]
    const idx = s.items.findIndex((i) => i.key === phKey)
    const keep = s.selectedKey === phKey
    if (idx === -1) {
      // 占位已被用户删掉，不把结果塞回来
      return false
    }
    if (!next.length) {
      failPlaceholder(capability, phKey, '未返回结果')
      return true
    }
    // 原位替换（重试也走这里），选中则跟到新 key（真实 task.id）。
    s.items.splice(idx, 1, ...next)
    if (keep) s.selectedKey = next[0].key
    return true
  }

  /** 从栏里拿掉一条。若删的是选中项，选相邻下一条，没有则草稿。 */
  function removeItem(capability: StudioCapability, key: string) {
    const s = sessions[capability]
    const idx = s.items.findIndex((i) => i.key === key)
    if (idx === -1) return
    const wasSelected = s.selectedKey === key
    s.items.splice(idx, 1)
    if (preview.value?.capability === capability && preview.value.key === key) {
      preview.value = null
    }
    if (!wasSelected) return
    // items 最新在前：删完后同一 idx 是更旧的「下一条」，没有再取上一条。
    const neighbor = s.items[idx] ?? s.items[idx - 1] ?? null
    if (neighbor) selectItem(capability, neighbor.key)
    else startDraft(capability)
  }

  function failPlaceholder(capability: StudioCapability, key: string, message: string) {
    const target = sessions[capability].items.find((i) => i.key === key)
    if (!target) return
    target.status = GenerationTaskStatus.Failed
    target.error = message
  }

  function patchItem(capability: StudioCapability, taskId: string, patch: Partial<StudioResult>) {
    const target = sessions[capability].items.find((i) => i.taskId === taskId || i.key === taskId)
    if (!target) return
    Object.assign(target, patch)
  }

  function mergePage(capability: StudioCapability, incoming: StudioResult[], append: boolean) {
    const s = sessions[capability]
    const incomingIds = new Set(incoming.map((i) => i.taskId ?? i.key))
    if (append) {
      const seen = new Set(s.items.map((i) => i.taskId ?? i.key))
      s.items.push(...incoming.filter((i) => !seen.has(i.taskId ?? i.key)))
      return
    }
    // 首页 hydrate：本地占位（还没 taskId）排在服务器列表前面，按 id 去重避免双份。
    const localOnly = s.items.filter((i) => !incomingIds.has(i.taskId ?? i.key))
    s.items = [...localOnly, ...incoming]
  }

  function markHydrated(capability: StudioCapability, page: number, hasMore: boolean) {
    const s = sessions[capability]
    s.hydrated = true
    s.listPage = page
    s.listHasMore = hasMore
  }

  function openPreview(capability: StudioCapability, key: string) {
    preview.value = { capability, key }
  }

  function closePreview() {
    preview.value = null
  }

  /** 三台进行中的视频一起轮，切到图片台时视频任务不能停。 */
  function allPending(): Array<{ capability: StudioCapability; item: StudioResult }> {
    const out: Array<{ capability: StudioCapability; item: StudioResult }> = []
    for (const cap of CAPS) {
      for (const item of sessions[cap].items) {
        if (item.taskId && !isTerminal(item.status)) out.push({ capability: cap, item })
      }
    }
    return out
  }

  return {
    sessions,
    preview,
    previewItem,
    session,
    selectedItem,
    pendingCount,
    selectItem,
    startDraft,
    ensureModel,
    setFormError,
    addReference,
    setComposerRefs,
    pushPlaceholder,
    reuseAsPlaceholder,
    replacePlaceholder,
    removeItem,
    failPlaceholder,
    patchItem,
    mergePage,
    markHydrated,
    openPreview,
    closePreview,
    allPending,
  }
})
