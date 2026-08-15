<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { renderMarkdown } from '../../../lib/markdown'
import { useAuthStore } from '../../../stores/auth'
import type { GroupedToolCall } from '../utils/groupMessages'
import AppIcon from '../../../components/AppIcon.vue'
import ToolCallCard from './ToolCallCard.vue'

const props = withDefaults(
  defineProps<{
    role: 'user' | 'assistant'
    content: string
    toolCalls?: GroupedToolCall[]
    totalTokens?: number | null
    /** 流式中：启用时间片节流重渲 + 打字光标 */
    streaming?: boolean
    /** 异常态：标红 */
    hasError?: boolean
    /** assistant 消息头部显示的名字（Agent 名，加载完成前用兜底） */
    agentName?: string
  }>(),
  {
    agentName: 'AI 助手',
    toolCalls: () => [],
    totalTokens: null,
    streaming: false,
    hasError: false,
  },
)

const auth = useAuthStore()

// 流式渲染：props.content 每个 delta 都变。markdown 无法安全增量渲染（代码围栏会改变后文
// 解析），只能整段重解析——若每个 delta / 每帧都渲一次，长回答下会 O(n²) 卡顿。
// 故按时间片节流（~60ms ≈ 16fps，接近逐字手感），大幅减少全量重解析次数；
// 流结束时立即 flush 出最终全文，不留半截。
const RENDER_INTERVAL = 60
const displayText = ref(props.content)
let timer: ReturnType<typeof setTimeout> | null = null

const flush = () => {
  timer = null
  displayText.value = props.content
}

watch(
  () => props.content,
  (text) => {
    if (!props.streaming) {
      // 非流式（历史消息 / 流已结束）：同步出全文
      if (timer) { clearTimeout(timer); timer = null }
      displayText.value = text
      return
    }
    if (timer != null) return // 本时间片内已排程，等它触发时取最新全文
    timer = setTimeout(flush, RENDER_INTERVAL)
  },
)

// streaming 由 true → false 时（流结束）立即补渲最终全文，避免停在上一个时间片的半截内容
watch(
  () => props.streaming,
  (isStreaming) => {
    if (!isStreaming) {
      if (timer) { clearTimeout(timer); timer = null }
      displayText.value = props.content
    }
  },
)

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

const html = computed(() =>
  props.role === 'assistant' ? renderMarkdown(displayText.value) : '',
)

// 首 token/工具卡片到达前的「正在思考」占位（Kimi 式，避免空气泡像卡死）
const thinking = computed(
  () => props.streaming && !props.content && !props.toolCalls?.length,
)

const userInitial = computed(() => auth.user?.username?.charAt(0).toUpperCase() || 'U')

// ---- 复制（http 环境 navigator.clipboard 不可用时回退 execCommand） ----
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

// 整条消息复制（hover 操作条；流式中不给复制，拿到的是半截内容）
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const copyContent = async () => {
  if (!(await copyTextToClipboard(props.content))) return
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 1500)
}

// 代码块复制：事件委托挂在 markdown 容器上（v-html 重渲后 DOM 重建也不丢监听）
function handleCodeCopyClick(event: MouseEvent) {
  const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-code-copy]')
  if (!btn) return
  const block = btn.closest<HTMLElement>('.code-block')
  const code = block?.querySelector('pre code')
  if (!code) return
  void copyTextToClipboard(code.textContent ?? '').then((ok) => {
    if (!ok) return
    btn.textContent = '已复制'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.textContent = '复制'
      btn.classList.remove('copied')
    }, 1500)
  })
}
</script>

<template>
  <div :class="['group flex gap-2.5', role === 'user' ? 'flex-row-reverse' : '']">
    <!-- 头像 -->
    <div
      class="w-[30px] h-[30px] rounded-[9px] grid place-items-center shrink-0 text-xs font-semibold mt-0.5"
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
      <!-- 角色标识（DSH 式：AI 消息上方显示模型/助手名） -->
      <div
        v-if="role === 'assistant'"
        class="flex items-center gap-1.5 mb-1 px-1"
      >
        <span class="text-xs font-medium text-muted">{{ agentName }}</span>
        <span
          v-if="totalTokens != null && !streaming"
          class="text-[11px] text-muted/60 tabular-nums"
        >{{ totalTokens.toLocaleString() }} tokens</span>
      </div>

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
            @click="handleCodeCopyClick"
            v-html="html"
          />
          <!-- eslint-enable vue/no-v-html -->

          <!-- 流式 I-beam 光标（打字机闪烁） -->
          <span
            v-if="streaming"
            class="stream-cursor"
          />
        </template>
      </div>

      <!-- 操作条：复制 hover 显现；token 常显（assistant 已并入角色行时不再重复） -->
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
          v-if="role === 'user' && totalTokens != null"
          class="text-muted/70 text-xs"
        >
          {{ totalTokens.toLocaleString() }} tokens
        </span>
      </div>
    </div>
  </div>
</template>
