<script setup lang="ts">
// 主区：当前选中记录的大图 / 播放器 / 音频 / 骨架 / 失败。
import { computed } from 'vue'
import { mediaUrl } from '../../../lib/media-api'
import {
  STATUS_LABEL,
  capabilityToAssetKind,
  isFailedStatus,
  isPendingStatus,
} from '../../../lib/studio/params'
import type { StudioResult } from '../../../lib/studio/types'
import type { ModelCapability } from '../../../types/ai-generation'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  result: StudioResult
  capability: ModelCapability
  now: number
}>()

const emit = defineEmits<{
  preview: []
  download: []
  saveAsset: []
  useAsReference: []
  retry: []
}>()

const src = computed(() => (props.result.media ? mediaUrl(props.result.media.url) : ''))
const canSave = computed(() => capabilityToAssetKind(props.capability) !== null && !!props.result.media)
const canRef = computed(() => props.capability !== 'audio' && !!props.result.media)
const elapsed = computed(() => {
  const sec = Math.max(0, Math.floor((props.now - props.result.startedAt) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex min-h-0 flex-1 items-center justify-center p-4">
      <!-- 进行中 -->
      <div
        v-if="isPendingStatus(result.status)"
        class="flex aspect-video w-full max-w-3xl flex-col items-center justify-center rounded-2xl bg-accent-soft"
      >
        <p class="animate-pulse text-sm text-accent-strong">
          {{ STATUS_LABEL[result.status] }}… {{ elapsed }}
        </p>
        <p class="mt-2 line-clamp-2 max-w-md px-6 text-center text-xs text-muted">
          {{ result.prompt }}
        </p>
      </div>

      <!-- 失败 -->
      <div
        v-else-if="isFailedStatus(result.status)"
        class="flex w-full max-w-lg flex-col items-center rounded-2xl bg-danger/10 p-8 text-center"
      >
        <AppIcon
          name="alert-circle"
          :size="28"
          class="text-danger"
        />
        <p class="od-error mt-3">
          {{ result.error || '生成失败' }}
        </p>
        <button
          class="od-btn od-btn-soft mt-4"
          @click="emit('retry')"
        >
          <AppIcon
            name="redo"
            :size="14"
          />
          同参数重试
        </button>
      </div>

      <!-- 图片 -->
      <button
        v-else-if="capability === 'image' && src"
        class="flex h-full w-full cursor-pointer items-center justify-center"
        @click="emit('preview')"
      >
        <img
          :src="src"
          :alt="result.prompt"
          class="max-h-full max-w-full rounded-2xl bg-fg/5 object-contain"
        >
      </button>

      <!-- 视频 -->
      <video
        v-else-if="capability === 'video' && src"
        :src="src"
        controls
        class="max-h-full max-w-full rounded-2xl bg-black object-contain"
      />

      <!-- 音频 -->
      <div
        v-else-if="capability === 'audio' && src"
        class="w-full max-w-lg rounded-2xl border border-border p-6"
      >
        <p class="line-clamp-3 text-sm text-fg">
          {{ result.prompt }}
        </p>
        <audio
          :src="src"
          controls
          class="mt-4 w-full"
        />
      </div>
    </div>

    <!-- 动作条 -->
    <div
      v-if="!isPendingStatus(result.status)"
      class="flex shrink-0 flex-wrap items-center gap-1 px-4 py-1.5"
    >
      <p class="min-w-0 flex-1 truncate text-[11px] text-muted">
        {{ result.model }} · {{ result.metaSummary }}
      </p>
      <button
        v-if="capability !== 'audio' && result.media && !isFailedStatus(result.status)"
        class="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-muted hover:bg-fg/5 hover:text-fg"
        @click="emit('preview')"
      >
        <AppIcon
          name="maximize-2"
          :size="13"
        />放大
      </button>
      <button
        v-if="canRef"
        class="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-muted hover:bg-fg/5 hover:text-fg"
        @click="emit('useAsReference')"
      >
        <AppIcon
          name="image"
          :size="13"
        />当参考
      </button>
      <button
        v-if="result.media"
        class="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-muted hover:bg-fg/5 hover:text-fg"
        @click="emit('download')"
      >
        <AppIcon
          name="download"
          :size="13"
        />下载
      </button>
      <button
        v-if="canSave"
        class="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-muted hover:bg-fg/5 hover:text-fg"
        @click="emit('saveAsset')"
      >
        <AppIcon
          name="folder-plus"
          :size="13"
        />存入素材库
      </button>
    </div>
  </div>
</template>
