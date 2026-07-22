<script setup lang="ts">
import { computed } from 'vue'
import type { DailyReport } from '../../../types/daily-report'
import { renderMarkdown } from '../../../lib/markdown'
import AppIcon from '../../../components/AppIcon.vue'

const props = withDefaults(defineProps<{
  report: DailyReport | null
  isLoading: boolean
  theme?: 'ai' | 'stock'
}>(), { theme: 'ai' })

const html = computed(() => (props.report ? renderMarkdown(props.report.content) : ''))

const formattedDate = computed(() =>
  props.report
    ? new Date(props.report.date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '',
)
</script>

<template>
  <!-- 加载态 -->
  <div
    v-if="isLoading"
    class="h-full flex items-center justify-center"
  >
    <div class="text-center">
      <div
        class="w-10 h-10 border-3 border-fg/10 border-t-fg/40 rounded-full animate-spin mx-auto mb-3"
      />
      <p class="text-muted text-sm">
        加载中...
      </p>
    </div>
  </div>

  <!-- 空态 -->
  <div
    v-else-if="!report"
    class="h-full flex items-center justify-center"
  >
    <div class="text-center">
      <AppIcon
        name="newspaper"
        :size="44"
        class="mx-auto mb-4 text-muted"
      />
      <p class="text-muted">
        选择一份日报查看详情
      </p>
    </div>
  </div>

  <!-- 正文 -->
  <div
    v-else
    class="h-full overflow-y-auto p-8 markdown-content"
    :class="`theme-${theme}`"
  >
    <!-- 标题 -->
    <div class="mb-8">
      <h1 class="text-xl font-display font-bold tracking-[-0.01em] text-fg mb-2">
        {{ report.title }}
      </h1>
      <p class="text-muted text-sm tabular-nums">
        {{ formattedDate }}
      </p>
    </div>

    <!-- Markdown 内容 - 卡片式布局（内容来自自有后端，markdown-it 已禁 raw HTML） -->
    <!-- eslint-disable vue/no-v-html -->
    <div
      class="space-y-6"
      v-html="html"
    />
    <!-- eslint-enable vue/no-v-html -->
  </div>
</template>
