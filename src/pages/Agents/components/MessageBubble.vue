<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { renderMarkdown } from '../../../lib/markdown'
import type { GroupedToolCall } from '../utils/groupMessages'
import ToolCallCard from './ToolCallCard.vue'

const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
  toolCalls?: GroupedToolCall[]
  totalTokens?: number | null
  /** 流式中：启用 rAF 节流重渲 + 打字光标 */
  streaming?: boolean
  /** 异常态：标红 */
  hasError?: boolean
}>()

// 流式渲染：props.content 每个 delta 都变，用 rAF 节流重渲 markdown（设计文档 §5）
const displayText = ref(props.content)
let rafId: number | null = null

watch(
  () => props.content,
  (text) => {
    if (!props.streaming) {
      displayText.value = text
      return
    }
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
      displayText.value = props.content
      rafId = null
    })
  },
)

const html = computed(() =>
  props.role === 'assistant' ? renderMarkdown(displayText.value) : '',
)
</script>

<template>
  <div :class="['flex', role === 'user' ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[80%] rounded-2xl px-4 py-3',
        role === 'user'
          ? 'bg-primary-500/25 border border-primary-500/30'
          : hasError
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-white/[0.04] border border-white/[0.06]',
      ]"
    >
      <!-- 工具调用卡片（实时流式与历史共用） -->
      <div
        v-if="toolCalls?.length"
        class="space-y-2 mb-2"
      >
        <ToolCallCard
          v-for="call in toolCalls"
          :key="call.id"
          :name="call.name"
          :args="call.args"
          :content="call.content"
          :status="call.status"
        />
      </div>

      <!-- user 消息纯文本；assistant 走 markdown（renderMarkdown 已防注入） -->
      <div
        v-if="role === 'user'"
        class="text-white/90 text-sm whitespace-pre-wrap break-words"
      >
        {{ content }}
      </div>
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-else
        class="markdown-content text-sm"
        v-html="html"
      />
      <!-- eslint-enable vue/no-v-html -->

      <!-- 流式光标 -->
      <span
        v-if="streaming"
        class="inline-block w-1.5 h-4 bg-primary-400 animate-pulse ml-0.5 align-text-bottom"
      />

      <!-- token 消耗（存量历史数据为 null 时不展示） -->
      <div
        v-if="role === 'assistant' && totalTokens != null && !streaming"
        class="text-white/30 text-xs mt-2"
      >
        {{ totalTokens.toLocaleString() }} tokens
      </div>
    </div>
  </div>
</template>
