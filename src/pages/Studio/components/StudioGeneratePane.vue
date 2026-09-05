<script setup lang="ts">
// 生成台能力子页：左表单 + 右结果流，供图片/视频/音频三台复用（按 capability 差异化）。
// 05 打通 image 同步出图 + 可复用骨架；07/08 往生成派发 switch 加 video/audio 分支。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { channelsApi } from '../../../lib/channels-api'
import { generationApi } from '../../../lib/generation-api'
import { modelOptionsFor } from '../../../lib/studio/models'
import {
  CAP_LABEL,
  IMAGE_QUALITIES,
  IMAGE_SIZES,
  VIDEO_QUALITIES,
  VIDEO_SECONDS,
  VIDEO_SIZES,
  AUDIO_VOICES,
  AUDIO_FORMATS,
  AUDIO_SPEEDS,
  capabilityToAssetKind,
  isTerminal,
  videoSecondsLabel,
} from '../../../lib/studio/params'
import { saveMediaAsAsset } from '../../../lib/studio/assets'
import { GenerationTaskStatus, type ModelCapability } from '../../../types/ai-generation'
import type { StudioResult } from '../../../lib/studio/types'
import type { MediaFileView } from '../../../types/media'
import OdSelect from '../../../components/ui/OdSelect.vue'
import AppIcon from '../../../components/AppIcon.vue'
import ResultCard from './ResultCard.vue'
import ReferencePicker from './ReferencePicker.vue'
import PromptLibraryPicker from './PromptLibraryPicker.vue'

const props = defineProps<{ capability: ModelCapability }>()

// 存素材是否可用（音频无对应 AssetKind → 隐藏入口）
const canSaveAsset = capabilityToAssetKind(props.capability) !== null

// ---- 渠道 → 模型二级选择器 ----
const { data: channels } = useQuery({
  queryKey: ['ai-channels'],
  queryFn: () => channelsApi.list(),
})
const modelOptions = computed(() => modelOptionsFor(channels.value, props.capability))
const modelRef = ref<string>()
const modelLabel = computed(
  () => modelOptions.value.find((o) => o.value === modelRef.value)?.label ?? modelRef.value ?? '',
)

// ---- 表单状态 ----
const prompt = ref('')
const imageSize = ref(IMAGE_SIZES[1]) // 1024x1024
const imageQuality = ref(IMAGE_QUALITIES[1]) // medium
// 视频参数（VIDEO_SECONDS[0]='' 默认档，显式取 '5'）
const videoSeconds = ref('5')
const videoSize = ref(VIDEO_SIZES[0]) // auto
const videoQuality = ref(VIDEO_QUALITIES[1]) // 720p
// 音频参数
const audioVoice = ref(AUDIO_VOICES[0]) // alloy
const audioFormat = ref(AUDIO_FORMATS[0]) // mp3
const audioSpeed = ref(AUDIO_SPEEDS[1]) // 1.0

// 参考图（图生图/图生视频；音频台不显示）。存 MediaFileView[]，生成时取 id
const referenceMedia = ref<MediaFileView[]>([])
const showPromptPicker = ref(false)

// ---- 结果流（本地，最新在前）----
const results = ref<StudioResult[]>([])
const generating = ref(false)
const formError = ref('')

function mediaToResult(m: MediaFileView, metaSummary: string): StudioResult {
  return {
    key: m.id,
    status: GenerationTaskStatus.Succeeded,
    prompt: prompt.value,
    model: modelLabel.value,
    metaSummary,
    media: m,
    error: null,
  }
}

// 视频异步任务 → pending 结果项（含 taskId，供 watcher 轮询回填）
function taskToResult(
  task: { id: string; status: GenerationTaskStatus; resultMedia: MediaFileView | null; error: string | null },
  metaSummary: string,
): StudioResult {
  return {
    key: task.id,
    status: task.status,
    prompt: prompt.value,
    model: modelLabel.value,
    metaSummary,
    media: task.resultMedia,
    error: task.error,
    taskId: task.id,
  }
}

async function runGenerate() {
  formError.value = ''
  if (!modelRef.value) {
    formError.value = '请先选择模型'
    return
  }
  if (!prompt.value.trim()) {
    formError.value = '请填写提示词'
    return
  }
  generating.value = true
  try {
    // 05 实现 image 同步分支；video（07）/audio（08）往此 switch 加分支
    if (props.capability === 'image') {
      const refIds = referenceMedia.value.map((m) => m.id)
      const { media } = await generationApi.generateImage({
        modelRef: modelRef.value,
        prompt: prompt.value,
        size: imageSize.value,
        quality: imageQuality.value,
        referenceMediaIds: refIds.length ? refIds : undefined,
      })
      const summary = `${imageSize.value} · ${imageQuality.value}`
      results.value.unshift(...media.map((m) => mediaToResult(m, summary)))
    } else if (props.capability === 'video') {
      const refIds = referenceMedia.value.map((m) => m.id)
      const { task } = await generationApi.generateVideo({
        modelRef: modelRef.value,
        prompt: prompt.value,
        seconds: videoSeconds.value,
        size: videoSize.value,
        vquality: videoQuality.value,
        referenceMediaIds: refIds.length ? refIds : undefined,
      })
      const summary = `${videoSecondsLabel(videoSeconds.value)} · ${videoSize.value} · ${videoQuality.value}`
      results.value.unshift(taskToResult(task, summary))
    } else if (props.capability === 'audio') {
      const { media } = await generationApi.generateAudio({
        modelRef: modelRef.value,
        prompt: prompt.value,
        voice: audioVoice.value,
        format: audioFormat.value,
        speed: audioSpeed.value,
      })
      const summary = `${audioVoice.value} · ${audioFormat.value} · ${audioSpeed.value}x`
      results.value.unshift(mediaToResult(media, summary))
    } else {
      formError.value = `${CAP_LABEL[props.capability]}台建设中…`
    }
  } catch (e) {
    formError.value = e instanceof Error ? e.message : '生成失败，请稍后重试'
  } finally {
    generating.value = false
  }
}

/** 结果存素材（走共享 helper）。音频无 AssetKind，canSaveAsset=false 时按钮不显示 */
async function saveAsset(r: StudioResult) {
  if (!r.media) return
  await saveMediaAsAsset(props.capability, r.media.id, r.prompt.slice(0, 40) || `${CAP_LABEL[props.capability]}生成结果`)
}

/** 失败重试：用当前表单参数重发（严格同参数重试在 09 历史页做） */
function retry() {
  void runGenerate()
}

function fillPrompt(text: string) {
  prompt.value = text
  showPromptPicker.value = false
}

// ---- 视频异步轮询 watcher（照抄画布 useGenerationTaskWatcher 模式，轮本地 results）----
// 画布那个绑死 canvas store + node metadata，不可复用；此处轮询本地 results 里的 pending 视频任务。
const POLL_INTERVAL_MS = 2000
let pollTimer: ReturnType<typeof setInterval> | null = null
let polling = false

async function pollPending() {
  if (polling) return
  const pending = results.value.filter((r) => r.taskId && !isTerminal(r.status))
  if (!pending.length) return
  polling = true
  try {
    const settled = await Promise.allSettled(
      pending.map((r) => generationApi.getTask(r.taskId as string)),
    )
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue
      const task = s.value
      const target = results.value.find((r) => r.taskId === task.id)
      if (target && isTerminal(task.status)) {
        target.status = task.status
        target.media = task.resultMedia
        target.error = task.error
      }
    }
  } finally {
    polling = false
  }
}

onMounted(() => {
  pollTimer = setInterval(() => void pollPending(), POLL_INTERVAL_MS)
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="flex items-start gap-6">
    <!-- 左表单 -->
    <aside class="od-panel w-[380px] shrink-0 space-y-4 p-5 lg:sticky lg:top-6">
      <div>
        <label class="od-label">模型</label>
        <OdSelect
          v-model="modelRef"
          :options="modelOptions"
          placeholder="选择渠道 / 模型"
        />
      </div>

      <div>
        <div class="flex items-center justify-between">
          <label class="od-label">提示词</label>
          <button
            class="flex items-center gap-1 text-xs text-accent hover:underline"
            @click="showPromptPicker = true"
          >
            <AppIcon
              name="sparkles"
              :size="12"
            />从提示词库选
          </button>
        </div>
        <textarea
          v-model="prompt"
          class="od-input min-h-[96px] w-full resize-y"
          placeholder="描述你想要的内容，越具体越好…"
        />
      </div>

      <!-- 图片参数 -->
      <div
        v-if="capability === 'image'"
        class="grid grid-cols-2 gap-3"
      >
        <div>
          <label class="od-label">尺寸</label>
          <OdSelect
            v-model="imageSize"
            :options="IMAGE_SIZES.map((s) => ({ value: s, label: s }))"
          />
        </div>
        <div>
          <label class="od-label">质量</label>
          <OdSelect
            v-model="imageQuality"
            :options="IMAGE_QUALITIES.map((q) => ({ value: q, label: q }))"
          />
        </div>
      </div>

      <!-- 视频参数 -->
      <div
        v-else-if="capability === 'video'"
        class="grid grid-cols-3 gap-3"
      >
        <div>
          <label class="od-label">时长</label>
          <OdSelect
            v-model="videoSeconds"
            :options="VIDEO_SECONDS.map((s) => ({ value: s, label: videoSecondsLabel(s) }))"
          />
        </div>
        <div>
          <label class="od-label">尺寸</label>
          <OdSelect
            v-model="videoSize"
            :options="VIDEO_SIZES.map((s) => ({ value: s, label: s }))"
          />
        </div>
        <div>
          <label class="od-label">画质</label>
          <OdSelect
            v-model="videoQuality"
            :options="VIDEO_QUALITIES.map((q) => ({ value: q, label: q }))"
          />
        </div>
      </div>

      <!-- 音频参数 -->
      <div
        v-else-if="capability === 'audio'"
        class="grid grid-cols-3 gap-3"
      >
        <div>
          <label class="od-label">嗓音</label>
          <OdSelect
            v-model="audioVoice"
            :options="AUDIO_VOICES.map((v) => ({ value: v, label: v }))"
          />
        </div>
        <div>
          <label class="od-label">格式</label>
          <OdSelect
            v-model="audioFormat"
            :options="AUDIO_FORMATS.map((f) => ({ value: f, label: f }))"
          />
        </div>
        <div>
          <label class="od-label">语速</label>
          <OdSelect
            v-model="audioSpeed"
            :options="AUDIO_SPEEDS.map((s) => ({ value: s, label: `${s}x` }))"
          />
        </div>
      </div>

      <!-- 参考图（图片/视频台，音频台不显示） -->
      <div v-if="capability !== 'audio'">
        <label class="od-label">参考图（可选）</label>
        <ReferencePicker v-model="referenceMedia" />
      </div>

      <p
        v-if="formError"
        class="od-error"
      >
        {{ formError }}
      </p>

      <button
        class="od-btn od-btn-primary od-btn-block"
        :disabled="generating"
        @click="runGenerate"
      >
        <AppIcon
          name="sparkles"
          :size="16"
        />
        {{ generating ? '生成中…' : `生成${CAP_LABEL[capability]}` }}
      </button>
    </aside>

    <!-- 右结果流 -->
    <main class="min-w-0 flex-1">
      <div
        v-if="results.length"
        class="grid grid-cols-2 gap-4 xl:grid-cols-3"
      >
        <ResultCard
          v-for="r in results"
          :key="r.key"
          :result="r"
          :capability="capability"
          :can-save-asset="canSaveAsset"
          @retry="retry"
          @save-asset="saveAsset(r)"
        />
      </div>
      <div
        v-else
        class="flex min-h-[300px] flex-col items-center justify-center text-muted"
      >
        <AppIcon
          name="sparkles"
          :size="28"
        />
        <p class="mt-3 text-sm">
          填好左侧表单，点「生成{{ CAP_LABEL[capability] }}」开始
        </p>
      </div>
    </main>

    <!-- 提示词库引用弹层 -->
    <PromptLibraryPicker
      v-if="showPromptPicker"
      @close="showPromptPicker = false"
      @select="fillPrompt"
    />
  </div>
</template>

