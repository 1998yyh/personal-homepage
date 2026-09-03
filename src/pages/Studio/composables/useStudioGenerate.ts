// 生成台副作用：hydrate / 生成 / 轮询 / 下载 / 参考图回填。
// 会话权威在 stores/studio；这里只调 API 再写回 store。
import { onBeforeUnmount, onMounted } from 'vue'
import { generationApi } from '../../../lib/generation-api'
import { mediaApi, mediaUrl } from '../../../lib/media-api'
import { saveMediaAsAsset } from '../../../lib/studio/assets'
import { modelOptionsFor } from '../../../lib/studio/models'
import { CAP_LABEL, isTerminal } from '../../../lib/studio/params'
import {
  applyParamsToComposer,
  composerToResultDraft,
  metaSummaryFromParams,
  refIdsFromParams,
  taskToStudioResult,
} from '../../../lib/studio/snapshot'
import { downloadBlob } from '../../../lib/zip'
import { showToast } from '../../../composables/useToast'
import { useStudioStore } from '../../../stores/studio'
import { channelsApi } from '../../../lib/channels-api'
import { GenerationTaskStatus } from '../../../types/ai-generation'
import type { MediaFileView } from '../../../types/media'
import type { StudioCapability, StudioResult } from '../../../lib/studio/types'

const LIST_LIMIT = 30
const POLL_INTERVAL_MS = 2000

// 轮询挂模块级：pane 不按能力销毁，但 bindPolling 仍可能多次挂上，用引用计数共用一个 timer。
let pollTimer: ReturnType<typeof setInterval> | null = null
let polling = false
let pollUsers = 0

export function useStudioGenerate() {
  const store = useStudioStore()

  async function hydrate(capability: StudioCapability, taskIdFromUrl?: string) {
    const s = store.session(capability)
    // 只有首次拉列表才自动选最近一条；否则点「+」清掉 ?t= 后会被这条逻辑又选回去。
    const firstVisit = !s.hydrated
    if (!s.hydrated) {
      try {
        await loadPage(capability, 1, false)
      } catch {
        store.setFormError(capability, '历史加载失败')
      }
    }
    if (taskIdFromUrl) {
      const hit = s.items.find((i) => i.taskId === taskIdFromUrl || i.key === taskIdFromUrl)
      if (hit) {
        store.selectItem(capability, hit.key)
        await fillRefs(capability, hit)
        return
      }
      try {
        const task = await generationApi.getTask(taskIdFromUrl)
        if (task.capability === capability) {
          const mapped = taskToStudioResult(task)
          s.items.unshift(mapped)
          store.selectItem(capability, mapped.key)
          await fillRefs(capability, mapped)
          return
        }
      } catch {
        /* 无效 t 忽略 */
      }
    }
    if (s.selectedKey) return
    if (firstVisit && s.items.length) {
      store.selectItem(capability, s.items[0].key)
      await fillRefs(capability, s.items[0])
    }
  }

  async function loadMore(capability: StudioCapability) {
    const s = store.session(capability)
    if (!s.listHasMore) return
    await loadPage(capability, s.listPage + 1, true)
  }

  let listLoading = false

  async function loadPage(capability: StudioCapability, page: number, append: boolean) {
    if (listLoading) return // 滚动尽头可能连续触发，串行拉页。
    listLoading = true
    try {
      const data = await generationApi.listTasks({
        page,
        limit: LIST_LIMIT,
        capability,
      })
      store.mergePage(capability, data.items.map(taskToStudioResult), append)
      store.markHydrated(capability, page, page < (data.totalPages || 1))
    } finally {
      listLoading = false
    }
  }

  /** 历史任务往往只有 referenceMediaIds，点 tab 后再拉媒体填槽；中途切走就不要写回 composer。 */
  async function fillRefs(capability: StudioCapability, item: StudioResult) {
    if (item.referenceMedia?.length) {
      store.setComposerRefs(capability, item.referenceMedia)
      return
    }
    const ids = refIdsFromParams(item.params)
    if (!ids.length) return
    const settled = await Promise.allSettled(ids.map((id) => mediaApi.getById(id)))
    const media: MediaFileView[] = []
    for (const row of settled) {
      if (row.status === 'fulfilled') media.push(row.value)
    }
    if (!media.length) return
    item.referenceMedia = media
    // 拉媒体是异步的，回来时可能已经点了别的 tab，只回填仍选中这一条。
    if (store.session(capability).selectedKey === item.key) {
      store.setComposerRefs(capability, media)
    }
  }

  function modelLabel(modelRef: string | undefined, channels: ReturnType<typeof modelOptionsFor>) {
    return channels.find((o) => o.value === modelRef)?.label ?? modelRef ?? ''
  }

  async function runGenerate(
    capability: StudioCapability,
    from?: StudioResult,
    modelLabelHint?: string,
    reuseKey?: string,
  ) {
    const s = store.session(capability)
    // 重试用快照拼一份 composer 拷贝，避免把当前输入框改脏。
    const c = from
      ? {
          ...s.composer,
          prompt: from.prompt,
          modelRef: from.modelRef,
          referenceMedia: from.referenceMedia ?? s.composer.referenceMedia,
        }
      : s.composer

    if (from) {
      applyParamsToComposer(capability, c, from.params, from.referenceMedia)
    }

    store.setFormError(capability, '')
    if (!c.modelRef) {
      store.setFormError(capability, '请先选择模型')
      return
    }
    if (!c.prompt.trim()) {
      store.setFormError(capability, '请填写提示词')
      return
    }

    let label = modelLabelHint || from?.model || ''
    if (!label) {
      const channels = await channelsApi.list().catch(() => [])
      label = modelLabel(c.modelRef, modelOptionsFor(channels, capability))
    }
    const draft = composerToResultDraft(capability, c, label, 'ph')
    let phKey: string
    // reuseKey：失败重试原地改成生成中；先 POST delete 旧任务，刷新才不会冒出两条。
    if (reuseKey) {
      if (from?.taskId) {
        try {
          await generationApi.removeTask(from.taskId)
        } catch {
          /* 旧失败任务清不掉也不挡原地重试 */
        }
      }
      phKey = store.reuseAsPlaceholder(capability, reuseKey, draft) ?? store.pushPlaceholder(capability, draft)
    } else {
      phKey = store.pushPlaceholder(capability, draft)
    }
    const refIds = c.referenceMedia.map((m) => m.id)
    const refs = refIds.length ? refIds : undefined

    try {
      if (capability === 'image') {
        const { task, media } = await generationApi.generateImage({
          modelRef: c.modelRef,
          prompt: c.prompt,
          size: String(c.imageSize),
          quality: String(c.imageQuality),
          referenceMediaIds: refs,
        })
        const first = media[0] ?? task.resultMedia
        settleGenerated(capability, phKey, [
          {
            key: task.id,
            status: task.status === GenerationTaskStatus.Failed ? task.status : GenerationTaskStatus.Succeeded,
            prompt: c.prompt,
            model: label,
            modelRef: c.modelRef,
            metaSummary: metaSummaryFromParams(capability, {
              size: c.imageSize,
              quality: c.imageQuality,
            }),
            media: first,
            error: task.error,
            taskId: task.id,
            params: { size: c.imageSize, quality: c.imageQuality, referenceMediaIds: refIds },
            referenceMedia: c.referenceMedia.map((m) => m),
            startedAt: Date.now(),
          },
        ])
      } else if (capability === 'video') {
        const { task } = await generationApi.generateVideo({
          modelRef: c.modelRef,
          prompt: c.prompt,
          seconds: c.videoSeconds,
          size: c.videoSize,
          vquality: c.videoQuality,
          referenceMediaIds: refs,
        })
        settleGenerated(capability, phKey, [
          {
            ...taskToStudioResult(task),
            model: label,
            modelRef: c.modelRef,
            params: {
              seconds: c.videoSeconds,
              size: c.videoSize,
              vquality: c.videoQuality,
              referenceMediaIds: refIds,
            },
            referenceMedia: c.referenceMedia.map((m) => m),
            prompt: c.prompt,
          },
        ])
      } else if (capability === 'audio') {
        const { task, media } = await generationApi.generateAudio({
          modelRef: c.modelRef,
          prompt: c.prompt,
          voice: c.audioVoice,
          format: c.audioFormat,
          speed: c.audioSpeed,
        })
        settleGenerated(capability, phKey, [
          {
            key: task.id,
            status: GenerationTaskStatus.Succeeded,
            prompt: c.prompt,
            model: label,
            modelRef: c.modelRef,
            metaSummary: metaSummaryFromParams(capability, {
              voice: c.audioVoice,
              format: c.audioFormat,
              speed: c.audioSpeed,
            }),
            media,
            error: task.error,
            taskId: task.id,
            params: { voice: c.audioVoice, format: c.audioFormat, speed: c.audioSpeed },
            startedAt: Date.now(),
          },
        ])
      } else {
        store.failPlaceholder(capability, phKey, `${CAP_LABEL[capability]}台建设中…`)
      }
    } catch (e) {
      store.failPlaceholder(capability, phKey, e instanceof Error ? e.message : '生成失败，请稍后重试')
    }
  }

  /** 占位已被删则顺手删远端任务，避免刷新后又冒出来 */
  function settleGenerated(capability: StudioCapability, phKey: string, next: StudioResult[]) {
    const kept = store.replacePlaceholder(capability, phKey, next)
    if (!kept) {
      const id = next[0]?.taskId
      if (id) void generationApi.removeTask(id)
    }
  }

  function retry(capability: StudioCapability, item: StudioResult) {
    void runGenerate(capability, item, undefined, item.key)
  }

  async function deleteItem(capability: StudioCapability, item: StudioResult) {
    // 有 taskId 才打后端；生成中占位只有 ph-*，只从栏里拿掉。
    if (item.taskId) {
      try {
        await generationApi.removeTask(item.taskId)
      } catch (e) {
        showToast(e instanceof Error ? e.message : '删除失败', 'error')
        return
      }
    }
    store.removeItem(capability, item.key)
    showToast('已删除', 'success')
  }

  async function download(item: StudioResult) {
    if (!item.media) return
    const res = await fetch(mediaUrl(item.media.url))
    const blob = await res.blob()
    downloadBlob(blob, item.media.fileName)
  }

  async function saveAsset(capability: StudioCapability, item: StudioResult) {
    if (!item.media) return
    await saveMediaAsAsset(
      capability,
      item.media.id,
      item.prompt.slice(0, 40) || `${CAP_LABEL[capability]}生成结果`,
    )
  }

  function useAsReference(capability: StudioCapability, item: StudioResult) {
    if (!item.media) return
    store.addReference(capability, item.media)
  }

  async function pollPending() {
    if (polling) return // 上一轮没完就跳过，避免 2s timer 叠请求。
    const pending = store.allPending()
    if (!pending.length) return
    polling = true
    try {
      const settled = await Promise.allSettled(pending.map((p) => generationApi.getTask(p.item.taskId as string)))
      for (let i = 0; i < settled.length; i++) {
        const row = settled[i]
        if (row.status !== 'fulfilled') continue
        const task = row.value
        if (!isTerminal(task.status)) continue
        const cap = pending[i].capability
        store.patchItem(cap, task.id, {
          status: task.status,
          media: task.resultMedia,
          error: task.error,
        })
      }
    } finally {
      polling = false
    }
  }

  function startPolling() {
    pollUsers += 1
    if (pollTimer) return // 已有 timer 只加计数，避免重复 setInterval。
    pollTimer = setInterval(() => void pollPending(), POLL_INTERVAL_MS)
  }

  function stopPolling() {
    pollUsers = Math.max(0, pollUsers - 1)
    if (pollUsers > 0) return
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }

  function bindPolling() {
    onMounted(startPolling)
    onBeforeUnmount(stopPolling)
  }

  return {
    hydrate,
    loadMore,
    runGenerate,
    retry,
    deleteItem,
    download,
    saveAsset,
    useAsReference,
    fillRefs,
    bindPolling,
  }
}
