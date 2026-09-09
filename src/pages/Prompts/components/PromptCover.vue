<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { mediaUrl } from '../../../lib/media-api'
import AppIcon from '../../../components/AppIcon.vue'
const props = withDefaults(
  defineProps<{
    src: string
    title: string
    priority?: boolean
    full?: boolean
  }>(),
  { priority: false, full: false },
)
const root = ref<HTMLElement | null>(null)
const near = ref(props.priority)
const loaded = ref(false)
const failed = ref(false)
let observer: IntersectionObserver | undefined
const imageSrc = computed(() =>
  near.value && !failed.value ? mediaUrl(props.src) : undefined,
)
watch(
  () => props.src,
  () => {
    loaded.value = false
    failed.value = false
  },
)
onMounted(() => {
  if (near.value) return
  if (!('IntersectionObserver' in window)) {
    near.value = true
    return
  }
  // 浏览器原生 lazy 通常提前加载较远的图片；只给邻近视口的封面设置 src，减少首屏争抢带宽。
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        near.value = true
        observer?.disconnect()
      }
    },
    { rootMargin: '240px' },
  )
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    ref="root"
    class="prompt-cover"
    :class="{ full }"
  >
    <div
      v-if="!src || failed"
      class="cover-placeholder"
    >
      <AppIcon
        name="image"
        :size="18"
      /><span>{{
        failed ? '图片暂不可用' : '文字提示词'
      }}</span>
    </div>
    <div
      v-else-if="!loaded"
      class="cover-skeleton"
      aria-hidden="true"
    />
    <img
      v-if="imageSrc"
      :src="imageSrc"
      :alt="title"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
      width="480"
      height="360"
      :class="{ loaded }"
      @load="loaded = true"
      @error="failed = true"
    >
  </div>
</template>

<style scoped>
.prompt-cover {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: color-mix(in oklch, var(--fg) 5%, var(--surface));
}
.prompt-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.15s;
}
.prompt-cover img.loaded {
  opacity: 1;
}
.prompt-cover.full {
  aspect-ratio: 4/3;
}
.full img {
  object-fit: contain;
}
.cover-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 6px;
  color: var(--muted);
  font-size: 11px;
  text-align: center;
}
.cover-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 25%,
    var(--surface) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cover-skeleton {
    animation: none;
  }
  .prompt-cover img {
    transition: none;
  }
}
</style>
