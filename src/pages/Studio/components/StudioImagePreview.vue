<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{ src: string; alt: string }>()
const emit = defineEmits<{ preview: [] }>()
const image = ref<HTMLImageElement | null>(null)
const state = ref<'loading' | 'loaded' | 'error'>('loading')
const attempt = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined

function clearTimer() {
  clearTimeout(timer)
}
function reload() {
  clearTimer()
  state.value = 'loading'
  attempt.value += 1
  // 网络一直挂起时提供退出加载态的入口；重试只加载媒体，不重新生成。
  timer = setTimeout(() => { state.value = 'error' }, 30_000)
}
function settle(event: Event, next: 'loaded' | 'error') {
  // 已卸载或上一次重试的图片事件不能覆盖当前加载状态。
  if (event.currentTarget !== image.value || state.value !== 'loading') return
  clearTimer()
  state.value = next
}
watch(() => props.src, reload, { immediate: true })
onBeforeUnmount(clearTimer)
</script>

<template>
  <div
    class="relative flex h-full w-full min-h-0 items-center justify-center"
    :aria-busy="state === 'loading'"
  >
    <button
      v-if="state !== 'error'"
      class="flex h-full w-full min-h-0 items-center justify-center"
      :disabled="state !== 'loaded'"
      aria-label="放大图片"
      @click="emit('preview')"
    >
      <img
        :key="attempt"
        ref="image"
        :src="src"
        :alt="alt"
        class="max-h-full max-w-full rounded-2xl bg-fg/5 object-contain"
        :style="{ visibility: state === 'loaded' ? 'visible' : 'hidden' }"
        @load="settle($event, 'loaded')"
        @error="settle($event, 'error')"
      >
    </button>
    <div
      v-if="state === 'loading'"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted"
      role="status"
    >
      <div class="size-7 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p class="text-sm">
        图片加载中…
      </p>
    </div>
    <div
      v-else-if="state === 'error'"
      class="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8"
      role="status"
    >
      <AppIcon
        name="image"
        :size="28"
        class="text-muted"
      />
      <p class="text-sm text-muted">
        图片加载失败，请重试。
      </p>
      <button
        class="od-btn od-btn-soft"
        @click="reload"
      >
        重新加载图片
      </button>
    </div>
  </div>
</template>
