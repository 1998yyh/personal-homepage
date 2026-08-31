<script setup lang="ts">
// 结果流卡片：图片/视频/音频三态展示（pending/processing 骨架 → succeeded 媒体 → failed 错误）。
import { computed } from 'vue'
import { mediaUrl } from '../../../lib/media-api'
import { STATUS_LABEL, isFailedStatus, statusChipClass } from '../../../lib/studio/params'
import { GenerationTaskStatus, type ModelCapability } from '../../../types/ai-generation'
import type { StudioResult } from '../../../lib/studio/types'
import AppIcon from '../../../components/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    result: StudioResult
    capability: ModelCapability
    canSaveAsset?: boolean
  }>(),
  { canSaveAsset: true },
)

defineEmits<{ retry: []; saveAsset: [] }>()

const isPending = computed(
  () =>
    props.result.status === GenerationTaskStatus.Pending ||
    props.result.status === GenerationTaskStatus.Processing,
)
const isFailed = computed(() => isFailedStatus(props.result.status))
const src = computed(() => (props.result.media ? mediaUrl(props.result.media.url) : ''))
</script>

<template>
  <article class="od-card group overflow-hidden">
    <!-- 图片/视频媒体区 -->
    <div
      v-if="capability !== 'audio'"
      class="relative"
      :class="capability === 'video' ? 'aspect-video' : 'aspect-square'"
    >
      <!-- pending/processing 骨架 -->
      <div
        v-if="isPending"
        class="absolute inset-0 flex items-center justify-center bg-accent-soft"
      >
        <div class="animate-pulse text-xs text-accent-strong">
          {{ STATUS_LABEL[result.status] }}…
        </div>
      </div>
      <!-- failed -->
      <div
        v-else-if="isFailed"
        class="absolute inset-0 flex items-center justify-center bg-danger/10"
      >
        <AppIcon
          name="alert-circle"
          :size="22"
          class="text-danger"
        />
      </div>
      <!-- succeeded: 图片 -->
      <img
        v-else-if="capability === 'image' && src"
        :src="src"
        :alt="result.prompt"
        class="h-full w-full object-cover"
      >
      <!-- succeeded: 视频 -->
      <video
        v-else-if="capability === 'video' && src"
        :src="src"
        controls
        class="h-full w-full bg-black object-contain"
      />
    </div>

    <!-- 音频媒体区 -->
    <div
      v-else
      class="px-4 pt-4"
    >
      <div
        v-if="isPending"
        class="flex h-14 items-center justify-center rounded-lg bg-accent-soft"
      >
        <span class="animate-pulse text-xs text-accent-strong">{{ STATUS_LABEL[result.status] }}…</span>
      </div>
      <div
        v-else-if="isFailed"
        class="flex h-14 items-center justify-center rounded-lg bg-danger/10"
      >
        <AppIcon
          name="alert-circle"
          :size="20"
          class="text-danger"
        />
      </div>
      <audio
        v-else-if="src"
        :src="src"
        controls
        class="w-full"
      />
    </div>

    <!-- 信息区 -->
    <div class="space-y-1.5 p-3">
      <p class="line-clamp-2 text-xs text-fg">
        {{ result.prompt }}
      </p>
      <div class="flex items-center justify-between">
        <span
          class="od-chip border"
          :class="statusChipClass(result.status)"
        >
          {{ STATUS_LABEL[result.status] }}
        </span>
        <div class="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            v-if="isFailed"
            class="od-icon-btn"
            title="同参数重试"
            @click="$emit('retry')"
          >
            <AppIcon
              name="redo"
              :size="14"
            />
          </button>
          <button
            v-else-if="result.media && props.canSaveAsset"
            class="od-icon-btn"
            title="存为素材"
            @click="$emit('saveAsset')"
          >
            <AppIcon
              name="download"
              :size="14"
            />
          </button>
        </div>
      </div>
      <p class="text-[11px] text-muted">
        {{ result.model }} · {{ result.metaSummary }}
      </p>
      <p
        v-if="result.error"
        class="od-error"
      >
        {{ result.error }}
      </p>
    </div>
  </article>
</template>
