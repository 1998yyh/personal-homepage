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

// 首 token/工具卡片到达前的「正在思考」占位（Kimi 式，避免空气泡像卡死）
const thinking = computed(
  () => props.streaming && !props.content && !props.toolCalls?.length,
)

const userInitial = computed(() => auth.user?.username?.charAt(0).toUpperCase() || 'U')

// ---- 复制（hover 操作条，http 环境 navigator.clipboard 不可用时回退 execCommand） ----
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const copyContent = async () => {
  const text = props.content
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div :class="['group flex gap-2.5', role === 'user' ? 'flex-row-reverse' : '']">
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
        <!-- 正在思考：三点弹跳占位 -->
        <div
          v-if="thinking"
          class="flex items-center gap-1.5 h-6 text-muted"
        >
          <span class="thinking-dot w-[6px] h-[6px] rounded-full bg-current" />
          <span class="thinking-dot d2 w-[6px] h-[6px] rounded-full bg-current" />
          <span class="thinking-dot d3 w-[6px] h-[6px] rounded-full bg-current" />
        </div>
        <template v-else>
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
        </template>
      </div>

      <!-- 操作条：复制 hover 显现（流式中不给复制，拿到的是半截内容）；token 常显 -->
      <div
        v-if="!streaming && (content || totalTokens != null)"
        class="flex items-center gap-2 mt-1.5"
        :class="role === 'user' ? 'justify-end' : ''"
      >
        <button
          v-if="content"
          class="w-6 h-6 rounded-md grid place-items-center text-muted/70 hover:text-fg hover:bg-fg/5 transition-all opacity-0 group-hover:opacity-100"
          :class="copied ? '!opacity-100 text-success hover:text-success' : ''"
          :title="copied ? '已复制' : '复制'"
          @click="copyContent"
        >
          <AppIcon
            :name="copied ? 'check' : 'copy'"
            :size="13"
          />
        </button>
        <span
          v-if="role === 'assistant' && totalTokens != null"
          class="text-muted/70 text-xs"
        >
          {{ totalTokens.toLocaleString() }} tokens
        </span>
      </div>
    </div>
  </div>
</template>
