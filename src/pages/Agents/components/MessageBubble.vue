<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { renderMarkdown } from '../../../lib/markdown'
import { useAuthStore } from '../../../stores/auth'
import type { GroupedToolCall } from '../utils/groupMessages'
import AppIcon from '../../../components/AppIcon.vue'
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

const auth = useAuthStore()

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

const userInitial = computed(() => auth.user?.username?.charAt(0).toUpperCase() || 'U')
</script>

<template>
  <div :class="['flex gap-2.5', role === 'user' ? 'flex-row-reverse' : '']">
    <!-- 头像 -->
    <div
      class="w-[30px] h-[30px] rounded-[9px] grid place-items-center shrink-0 text-xs font-semibold"
      :class="role === 'user' ? 'bg-accent-soft text-accent-strong' : 'bg-accent text-white'"
    >
      <span v-if="role === 'user'">{{ userInitial }}</span>
      <AppIcon
        v-else
        name="bot"
        :size="16"
      />
    </div>

    <!-- 内容体 -->
    <div class="min-w-0 max-w-[80%]">
      <!-- 工具调用卡片（实时流式与历史共用） -->
      <div
        v-if="toolCalls?.length"
        class="flex flex-col gap-2 mb-2"
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

      <!-- user 消息：accent-soft 气泡纯文本；assistant：无底色 markdown -->
      <div
        v-if="role === 'user'"
        class="bg-accent-soft rounded-[14px] rounded-tr-[4px] px-3.5 py-2.5 text-fg text-sm whitespace-pre-wrap break-words"
      >
        {{ content }}
      </div>
      <div
        v-else
        class="py-0.5"
        :class="hasError ? 'rounded-xl border border-danger/40 bg-danger/5 px-3.5 py-2.5' : ''"
      >
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="markdown-content chat-md text-sm"
          v-html="html"
        />
        <!-- eslint-enable vue/no-v-html -->

        <!-- 流式光标 -->
        <span
          v-if="streaming"
          class="inline-block w-[8px] h-[15px] bg-accent animate-pulse align-text-bottom"
        />
      </div>

      <!-- token 消耗（存量历史数据为 null 时不展示） -->
      <div
        v-if="role === 'assistant' && totalTokens != null && !streaming"
        class="text-muted/70 text-xs mt-1.5"
      >
        {{ totalTokens.toLocaleString() }} tokens
      </div>
    </div>
  </div>
</template>
