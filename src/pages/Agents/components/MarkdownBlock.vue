<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../../../lib/markdown'

// 流式块级渲染的最小单元（设计对齐 deepseek-harness 的冻结块缓存）：
// 父组件按 key=源码偏移复用本组件，text 不变时 Vue props 浅比较直接跳过更新——
// 已闭合块的 parse 与 DOM 在整个流中只发生一次，每帧只有活跃尾块重渲。
const props = defineProps<{ text: string }>()

const html = computed(() => renderMarkdown(props.text))
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="md-block"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>
