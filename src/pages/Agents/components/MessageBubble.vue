<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { renderMarkdown } from '../../../lib/markdown'
import { useAuthStore } from '../../../stores/auth'
import type { GroupedToolCall } from '../utils/groupMessages'
import AppIcon from '../../../components/AppIcon.vue'
import MarkdownBlock from './MarkdownBlock.vue'
import ReasoningRow from './ReasoningRow.vue'
import TaskToolCard from './TaskToolCard.vue'
import ToolCallCard from './ToolCallCard.vue'

const props = withDefaults(
  defineProps<{
    role: 'user' | 'assistant'
    content: string
    /** 推理模型的思考过程（流式实时累计 / 历史来自 DB），非推理模型为 null */
    reasoning?: string | null
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
    reasoning: null,
    toolCalls: () => [],
    totalTokens: null,
    streaming: false,
    hasError: false,
  },
)

const auth = useAuthStore()

// ── 流式块级增量渲染（对齐 deepseek-harness 的设计） ──────────────
// 流式文本切成「顶层块」数组（围栏感知的空行切分），key = 块起始源码偏移
// （append-only 流下不变）。已闭合块的 text 不再变化，MarkdownBlock 子组件
// props 浅比较跳过更新——其 parse 与 DOM 在整个流中只发生一次；每帧只有
// 活跃尾块重渲。避免了「v-html 整段 innerHTML 替换」随回答变长的 O(n²) 重建。
// 流结束后整文单次重渲（self-heal：修复跨块的引用链接/松散列表等边界）。
interface Block {
  key: number
  text: string
}

const streamBlocks = shallowRef<Block[]>([])
const fullHtml = ref('')
let carried: Block[] = []

/** 围栏感知的顶层块切分：围栏外空行为块界，代码围栏内的空行不切 */
function splitBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let fence: string | null = null // 未闭合围栏的标记符（` 或 ~）
  let blockStart = 0
  let pos = 0

  for (const line of lines) {
    const trimmed = line.trimStart()
    const marker = /^(`{3,}|~{3,})/.exec(trimmed)
    if (fence) {
      if (marker && marker[1][0] === fence[0]) fence = null
    } else if (marker) {
      fence = marker[1][0]
    } else if (trimmed === '') {
      if (pos > blockStart) blocks.push({ key: blockStart, text: text.slice(blockStart, pos) })
      blockStart = pos + line.length + 1
    }
    pos += line.length + 1
  }
  if (blockStart < text.length) blocks.push({ key: blockStart, text: text.slice(blockStart) })
  return blocks
}

/** 数据层已按帧合帧（useAgentStream），这里每帧重切一次；复用未变块的引用避免子组件更新 */
function flushBlocks() {
  const prev = new Map(carried.map((b) => [b.key, b]))
  const next = splitBlocks(props.content).map((b) => {
    const old = prev.get(b.key)
    return old && old.text === b.text ? old : b
  })
  carried = next
  streamBlocks.value = next
}

/** 非流式/流结束：整文单次渲染 */
function renderFull(text: string) {
  carried = []
  streamBlocks.value = []
  fullHtml.value = text ? renderMarkdown(text) : ''
}

// 历史消息挂载即渲染全文
if (!props.streaming && props.content) {
  renderFull(props.content)
}

// 合并监听 content 与 streaming：流式中按帧增量切块；流结束（或历史内容变化）整文重渲
watch(
  () => [props.content, props.streaming],
  () => {
    if (!props.streaming) {
      renderFull(props.content)
      return
    }
    flushBlocks()
  },
)

// 首 token/工具卡片/思考内容到达前的「正在思考」占位（Kimi 式，避免空气泡像卡死）
const thinking = computed(
  () => props.streaming && !props.content && !props.toolCalls.length && !props.reasoning,
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

      <!-- 工具调用卡片（实时流式与历史共用；delegate_task 走子代理轨迹卡片） -->
      <div
        v-if="toolCalls.length"
        class="flex flex-col gap-2 mb-2"
      >
        <template
          v-for="call in toolCalls"
          :key="call.id"
        >
          <TaskToolCard
            v-if="call.name === 'delegate_task'"
            :name="call.name"
            :args="call.args"
            :content="call.content"
            :status="call.status"
            :sub-trace="call.subTrace"
          />
          <ToolCallCard
            v-else
            :name="call.name"
            :args="call.args"
            :content="call.content"
            :status="call.status"
          />
        </template>
      </div>

      <!-- 思考过程（推理模型；折叠头行带实时摘要 + shimmer，见 ReasoningRow） -->
      <ReasoningRow
        v-if="reasoning"
        class="mb-2"
        :text="reasoning"
        :streaming="streaming"
      />

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
          <div
            class="markdown-content chat-md text-sm"
            @click="handleCodeCopyClick"
          >
            <!-- 流式中：块级增量渲染，已闭合块（key=源码偏移）的 DOM 不再触碰 -->
            <template v-if="streaming">
              <MarkdownBlock
                v-for="block in streamBlocks"
                :key="block.key"
                :text="block.text"
              />
            </template>
            <!-- 非流式/流结束：整文单次渲染 -->
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-else
              v-html="fullHtml"
            />
            <!-- eslint-enable vue/no-v-html -->
          </div>

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
