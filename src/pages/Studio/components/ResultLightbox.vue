<script setup lang="ts">
// 结果灯箱：object-contain 放大，Esc / 点遮罩关闭。
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { mediaUrl } from '../../../lib/media-api'
import type { StudioResult } from '../../../lib/studio/types'
import type { ModelCapability } from '../../../types/ai-generation'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  result: StudioResult
  capability: ModelCapability
}>()

const emit = defineEmits<{
  close: []
  download: []
  saveAsset: []
}>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const src = computed(() => (props.result.media ? mediaUrl(props.result.media.url) : ''))
</script>

<template>
  <div
    class="od-modal-overlay z-[70]"
    @click.self="emit('close')"
  >
    <div class="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center">
      <img
        v-if="capability === 'image' && src"
        :src="src"
        :alt="result.prompt"
        class="max-h-[80vh] max-w-[90vw] object-contain"
      >
      <video
        v-else-if="capability === 'video' && src"
        :src="src"
        controls
        class="max-h-[80vh] max-w-[90vw] bg-black"
      />
      <audio
        v-else-if="src"
        :src="src"
        controls
        class="w-[min(480px,90vw)]"
      />
      <div class="mt-3 flex items-center gap-2">
        <button
          class="od-icon-btn"
          title="下载"
          aria-label="下载"
          @click="emit('download')"
        >
          <AppIcon
            name="download"
            :size="16"
          />
        </button>
        <button
          v-if="capability !== 'audio'"
          class="od-icon-btn"
          title="存为素材"
          aria-label="存为素材"
          @click="emit('saveAsset')"
        >
          <AppIcon
            name="folder-plus"
            :size="16"
          />
        </button>
        <button
          class="od-icon-btn"
          title="关闭"
          aria-label="关闭"
          @click="emit('close')"
        >
          <AppIcon
            name="x"
            :size="16"
          />
        </button>
      </div>
    </div>
  </div>
</template>
