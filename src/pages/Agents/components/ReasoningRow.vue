<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '../../../components/AppIcon.vue'

/**
 * 思考过程行（DSH ReasoningRow 移植）：
 * - 折叠态头行带实时摘要：streaming 时显示最新一行并横向跟随滚动，settled 显示首行
 * - running 态标题/摘要加 shimmer 扫光（prefers-reduced-motion 下回退纯色，见 index.css）
 * - 展开体为纯文本（v-text），max-h 滚动，streaming 时自动吸底
 *
 * 注：本端 reasoning 是单条累计串（跨轮拼在一起），天然满足 DSH「只有尾块动画」
 * 的规则——只有一行，running 时才扫光。
 */
const props = withDefaults(
  defineProps<{
    text: string
    streaming?: boolean
  }>(),
  { streaming: false },
)

// 流式中默认展开（等待期能看到内容滚动）；历史默认折叠
const expanded = ref(!!props.streaming)
const bodyEl = ref<HTMLElement | null>(null)
const summaryEl = ref<HTMLElement | null>(null)

// 流式结束自动折叠（对齐 DSH：settled 后思考让位于正文）
watch(
  () => props.streaming,
  (s) => {
    if (!s) expanded.value = false
  },
)

/** 折叠态摘要行：streaming 取最新非空行，settled 取首行 */
const summary = computed(() => {
  const lines = props.text.split('\n')
  if (props.streaming) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim()) return lines[i].trim()
    }
    return ''
  }
  return lines.find((l) => l.trim())?.trim() ?? ''
})

// streaming 中：摘要横向跟随到尾（最新内容在末尾）；展开体纵向吸底
watch(
  () => props.text,
  () => {
    if (!props.streaming) return
    nextTick(() => {
      const s = summaryEl.value
      if (s) s.scrollLeft = s.scrollWidth
      const b = bodyEl.value
      if (b && expanded.value) b.scrollTop = b.scrollHeight
    })
  },
)
</script>

<template>
  <div class="rounded-xl border border-border bg-fg/[0.02] text-xs overflow-hidden">
    <button
      class="w-full px-3 py-2 flex items-center gap-2 text-muted hover:text-fg transition-colors text-left"
      @click="expanded = !expanded"
    >
      <AppIcon
        name="sparkles"
        :size="12"
        class="text-accent-strong shrink-0"
        :class="streaming ? 'animate-pulse' : ''"
      />
      <span
        class="shrink-0"
        :class="streaming ? 'reasoning-shimmer' : ''"
      >{{ streaming ? '正在思考…' : '思考过程' }}</span>
      <!-- 折叠时的实时摘要行（展开时不占空间） -->
      <span
        v-if="!expanded && summary"
        ref="summaryEl"
        class="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-muted/70"
        :class="streaming ? 'reasoning-shimmer' : ''"
      >{{ summary }}</span>
      <AppIcon
        name="chevron-down"
        :size="12"
        class="ml-auto shrink-0 transition-transform"
        :class="expanded ? 'rotate-180' : ''"
      />
    </button>
    <div
      v-if="expanded"
      ref="bodyEl"
      class="px-3 pb-2.5 text-muted/80 whitespace-pre-wrap break-words leading-relaxed max-h-[240px] overflow-y-auto"
      v-text="text"
    />
  </div>
</template>
