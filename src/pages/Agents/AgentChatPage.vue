<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import agentsApi from '../../lib/agents-api'
import type { Conversation } from '../../types/agent'
import { useAgentStream } from '../../composables/useAgentStream'
import type { TurnMetrics } from '../../composables/useAgentStream'
import { groupMessages } from './utils/groupMessages'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import ConversationList from './components/ConversationList.vue'
import MessageBubble from './components/MessageBubble.vue'
import BackgroundTasksPill from './components/BackgroundTasksPill.vue'
import MessageQueueStrip from './components/MessageQueueStrip.vue'
import SlashCommandMenu from './components/SlashCommandMenu.vue'
import type { SlashCommand } from './components/SlashCommandMenu.vue'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()

// 响应式取路由参数：同组件实例内 /agents/a → /agents/b 直接切换时 queryKey/请求随动
const agentId = computed(() => String(route.params.id || ''))

// ---- Agent 详情（标题展示 + 停用判断） ----
const { data: agent, error: agentError } = useQuery({
  queryKey: computed(() => ['agents', agentId.value]),
  queryFn: () => agentsApi.getById(agentId.value),
})
const agentDisabled = computed(
  () => (agentError.value as { response?: { status?: number } } | null)?.response?.status === 410,
)

// ---- 会话列表（滚动加载更多） ----
const {
  data: convData,
  isLoading: convLoading,
  hasNextPage: convHasMore,
  fetchNextPage: fetchMoreConvs,
  isFetchingNextPage: convFetchingMore,
} = useInfiniteQuery({
  queryKey: computed(() => ['conversations', agentId.value]),
  queryFn: ({ pageParam }) => agentsApi.listConversations(agentId.value, pageParam),
  initialPageParam: 1,
  getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
})
const conversations = computed(() => convData.value?.pages.flatMap((p) => p.items) ?? [])

// ---- 会话选中：null = 未选；草稿态由 isDraft 标记 ----
const selectedId = ref<string | null>(null)
const isDraft = ref(false)

// 列表加载后：优先按 ?c= 定位，无则自动选最近一个（immediate 必须——CLAUDE.md 规范）。
// 草稿态（用户已点「新对话」）不覆盖：避免占位项与真实选中并存
watch(
  conversations,
  (list) => {
    if (!list.length || selectedId.value || isDraft.value) return
    const fromQuery = list.find((c) => c.id === route.query.c)
    selectedId.value = fromQuery?.id ?? list[0].id
  },
  { immediate: true },
)

// 选中态同步到 URL（刷新/分享不丢，replace 不刷历史记录）
watch(selectedId, (id) => {
  router.replace({ query: id ? { c: id } : {} })
})

const selectConversation = (id: string) => {
  stream.abort() // 断流 + 清停止残影（无条件，abort 内部已幂等）
  isDraft.value = false
  selectedId.value = id
  lastTurnMetrics.value = null // 页脚指标只跟随当前会话的当轮
  queuedMessages.value = [] // 队列跟随会话，切换即丢弃
  userNearBottom.value = true // 切会话后重新跟随吸底
}

// ---- 新建会话：懒创建，首条消息发出时才 POST（设计文档 §7） ----
const startDraft = () => {
  stream.abort() // 同上：断流 + 清停止残影
  selectedId.value = null
  isDraft.value = true
  lastTurnMetrics.value = null
  queuedMessages.value = []
  userNearBottom.value = true
  focusInput()
}

// ---- 消息历史（DESC 分页，向上翻页 prepend） ----
const activeConvId = computed(() => (isDraft.value ? null : selectedId.value))
const {
  data: msgData,
  hasNextPage: msgHasMore,
  fetchNextPage: fetchMoreMsgs,
  isFetchingNextPage: msgFetchingMore,
} = useInfiniteQuery({
  queryKey: ['messages', activeConvId],
  queryFn: ({ pageParam }) => agentsApi.listMessages(activeConvId.value!, pageParam),
  initialPageParam: 1,
  getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  enabled: computed(() => !!activeConvId.value),
})

// pages 按新→旧排列，每页内 DESC；整体反转后得时间正序
const historyMessages = computed(() =>
  (msgData.value?.pages ?? [])
    .slice()
    .reverse()
    .flatMap((p) => p.items.slice().reverse()),
)
const grouped = computed(() => groupMessages(historyMessages.value))

// ---- SSE 流式 ----
const stream = useAgentStream()
/** 发送中的 user 消息（后端流结束才落库，先本地乐观展示） */
const pendingUserMessage = ref<string | null>(null)

// ---- 轮次状态与计时（DSH TurnStatus/TurnTail 移植） ----
// 锚点取 status→streaming 边沿（send 内同步置位，与 composable 内 sendAt 相差 <1ms，无需透出）
const turnAnchorAt = ref<number | null>(null)
/** 1s tick 驱动 TurnStatus 计时显示 */
const nowMs = ref(0)
let tickTimer: ReturnType<typeof setInterval> | null = null
/** 刚结束那轮的耗时指标（下次发送/切换会话时清空；历史轮次无页脚——刻意不持久化） */
const lastTurnMetrics = ref<TurnMetrics | null>(null)

watch(stream.status, (s, prev) => {
  if (s === 'streaming' && prev !== 'streaming') {
    turnAnchorAt.value = performance.now()
    nowMs.value = 0
    tickTimer = setInterval(() => {
      nowMs.value = performance.now() - (turnAnchorAt.value ?? 0)
    }, 1000)
  } else if (prev === 'streaming') {
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    turnAnchorAt.value = null
    // 正常结束：结算页脚指标（abort/error 不展示——那轮没有完整数据）
    if (s === 'done' && stream.turnMetrics.value) {
      lastTurnMetrics.value = stream.turnMetrics.value
    }
    // 排队消息（DSH QueueDock）：流自然结束才自动续发，abort/error 不续发
    if (s === 'done' && queuedMessages.value.length) {
      const nextContent = queuedMessages.value.shift()!
      nextTick(() => {
        input.value = nextContent
        void sendMessage()
      })
    }
  }
})

/** 本轮已流式时长（仅 streaming 中有意义） */
const turnElapsedMs = computed(() =>
  stream.streaming.value && turnAnchorAt.value != null
    ? Math.max(nowMs.value, performance.now() - turnAnchorAt.value)
    : 0,
)

/** TurnStatus 计时格式化：m:ss */
const formatMmSs = (ms: number) => {
  const total = Math.floor(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const input = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const messagesEl = ref<HTMLElement | null>(null)
/** 建会话等发送前置步骤的错误（流内错误走 stream.errorMessage） */
const sendError = ref<string | null>(null)

// ---- 排队消息（DSH QueueDock 移植）：流式中继续发送的消息排队，流自然结束后按序自动续发 ----
// 仅 tab 本地（刷新即丢，刻意不做后端持久化）；切换会话/草稿时清空
const queuedMessages = ref<string[]>([])

const removeQueued = (index: number) => {
  queuedMessages.value.splice(index, 1)
}

/** 点排队行：文本回输入框并出队（廉价编辑） */
const editQueued = (index: number) => {
  const [msg] = queuedMessages.value.splice(index, 1)
  input.value = msg
  focusInput()
}

// ---- 斜杠命令（DSH 移植极简版）：输入 `/` 开头且无空白时弹菜单 ----
const slashCommands = computed<SlashCommand[]>(() => [
  { name: '/clear', description: '清空当前对话，开始新会话', icon: 'plus', enabled: true },
  { name: '/stop', description: '停止当前生成', icon: 'square', enabled: stream.streaming.value },
])
const slashMenuOpen = computed(() => input.value.startsWith('/') && !/\s/.test(input.value.trimEnd()))
const slashActiveIndex = ref(0)
watch(input, () => {
  slashActiveIndex.value = 0 // 输入变化重置高亮
})

const runSlashCommand = (cmd: SlashCommand) => {
  input.value = ''
  if (cmd.name === '/clear') {
    startDraft()
  } else if (cmd.name === '/stop') {
    if (stream.streaming.value) stopStreaming()
  }
}

/** 菜单打开时的键盘导航：上下移动高亮（Enter 执行在 onEnterKey 中处理） */
const onSlashNav = (event: KeyboardEvent) => {
  if (!slashMenuOpen.value) return
  const count = slashCommands.value.filter((c) =>
    c.name.slice(1).startsWith(input.value.slice(1).toLowerCase()),
  ).length
  if (!count) return
  event.preventDefault()
  slashActiveIndex.value =
    event.key === 'ArrowUp'
      ? (slashActiveIndex.value - 1 + count) % count
      : (slashActiveIndex.value + 1) % count
}

const onSlashEsc = () => {
  if (slashMenuOpen.value) input.value = '' // 清空即关闭菜单
}

// 智能滚动（Kimi 式）：用户在底部附近时新内容才吸底，上翻看历史不被拽回去
const userNearBottom = ref(true)
let scrollRaf: number | null = null

const scrollToBottom = (force = false) => {
  if (force) userNearBottom.value = true
  if (scrollRaf != null) return // 本帧已排程，等它触发时取最新 scrollHeight
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = null
    const el = messagesEl.value
    if (el && userNearBottom.value) el.scrollTop = el.scrollHeight
  })
}

const handleMessagesScroll = () => {
  const el = messagesEl.value
  if (!el) return
  userNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

// 新消息/流式输出时自动滚底（scrollToBottom 不能直接当回调——watch 会把 newValue 塞进 force 参数）
watch([() => grouped.value.length, () => stream.streamingMessage.value?.text], () => scrollToBottom())

const focusInput = () => nextTick(() => inputEl.value?.focus())

onMounted(focusInput)

// 草稿态建议问题（Kimi 首页式引导，点击填入输入框）
const suggestions = ['你能做什么？', '介绍一下你的能力', '帮我出个主意']
const applySuggestion = (text: string) => {
  input.value = text
  focusInput()
}

// textarea 自动增高（上限 180px，对齐设计稿 composer）
watch(input, () => {
  nextTick(() => {
    const el = inputEl.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  })
})

// Enter 发送：IME 组合输入（isComposing）时放行不拦截，避免中文候选确认被吞
const onEnterKey = (event: KeyboardEvent) => {
  if (event.isComposing) return
  event.preventDefault()
  // 斜杠菜单打开时：Enter 执行高亮命令而非发送
  if (slashMenuOpen.value) {
    const q = input.value.slice(1).toLowerCase()
    const filtered = slashCommands.value.filter((c) => c.name.slice(1).startsWith(q))
    const cmd = filtered[slashActiveIndex.value] ?? filtered[0]
    if (cmd) runSlashCommand(cmd)
    return
  }
  void sendMessage()
}

/**
 * 发送代际令牌：onStreamEnd 里的归位（invalidate→清 pending→stream.reset）是异步的，
 * 队列自动续发的新一轮可能已先开始——迟到的 reset() 会把新一轮 status 踩回 idle、
 * 清空它的流式气泡与乐观用户气泡（实测复现：续发轮结束后状态机卡死、消息列表不刷新）。
 * 只有「仍是最新一轮」才允许做归位清理。
 */
let sendSeq = 0

const sendMessage = async () => {
  const content = input.value.trim()
  if (!content || agentDisabled.value) return
  // 流式中继续输入：排队等待，流自然结束后自动续发（abort/error 不续发）
  if (stream.streaming.value) {
    queuedMessages.value.push(content)
    input.value = ''
    return
  }
  const mySeq = ++sendSeq
  sendError.value = null
  lastTurnMetrics.value = null // 新一轮开始，清掉上轮页脚

  // 草稿态：先建真实会话
  let convId = activeConvId.value
  if (!convId) {
    try {
      const conv: Conversation = await agentsApi.createConversation(agentId.value)
      convId = conv.id
    } catch {
      sendError.value = '创建会话失败，请稍后重试'
      return
    }
    isDraft.value = false
    selectedId.value = convId
    queryClient.invalidateQueries({ queryKey: ['conversations', agentId.value] })
  }

  input.value = ''
  pendingUserMessage.value = content
  scrollToBottom(true) // 自己发的消息必须可见，强制吸底

  await stream.send(convId, content, () => {
    // 流正常结束：消息列表归位后清理临时状态（历史里已有 user+assistant）
    // background-tasks 一并 invalidate：run_background_task 在流内建行，
    // pill 的首查若发生在建行之前会返回空且停轮询，靠这里的失效触发首显
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['messages', convId] }),
      queryClient.invalidateQueries({ queryKey: ['conversations', agentId.value] }),
      queryClient.invalidateQueries({ queryKey: ['background-tasks', convId] }),
    ]).then(() => {
      if (mySeq !== sendSeq) return // 队列续发已开新一轮，归位交给那轮自己
      pendingUserMessage.value = null
      stream.reset()
    })
  })

  // error 状态保留 pendingUserMessage 与已生成文本，等用户重试或放弃
  if (stream.status.value !== 'error') {
    pendingUserMessage.value = null
  }
  focusInput() // 发完把焦点还给输入框，接着聊
}

// 停止生成：保留中断残影（running 卡片定格为「已中断」，不让已生成内容凭空消失），
// 同时拉一次消息列表与后端断连时的落库状态对齐（后端可能已持久化也可能丢弃）。
// 残影不做自动 reset：本地 refetch 太快（~100ms），即清会让用户根本来不及看到中断态；
// 残影随下一次 send（send 内重建 streamingMessage）或切换会话（abort 不带 keepPartial）自然消散。
// 已知边角：若后端恰好持久化了部分 assistant 内容，历史与残影会短暂双显——可接受的取舍。
const stopStreaming = () => {
  const convId = activeConvId.value
  stream.abort({ keepPartial: true })
  pendingUserMessage.value = null
  if (convId) {
    queryClient.invalidateQueries({ queryKey: ['messages', convId] })
    queryClient.invalidateQueries({ queryKey: ['conversations', agentId] })
    queryClient.invalidateQueries({ queryKey: ['background-tasks', convId] })
  }
}

const retrySend = async () => {
  const convId = activeConvId.value
  if (!convId || stream.streaming.value) return
  await stream.retry(convId, () => {
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['messages', convId] }),
      queryClient.invalidateQueries({ queryKey: ['conversations', agentId.value] }),
    ]).then(() => {
      pendingUserMessage.value = null
      stream.reset()
    })
  })
  if (stream.status.value !== 'error') {
    pendingUserMessage.value = null
  }
  focusInput()
}

// ---- 删除会话：确认 → 断流 → 删除 → 降级选中（设计文档 §7） ----
const deletingConv = ref<Conversation | null>(null)

const deleteMutation = useMutation({
  mutationFn: (id: string) => agentsApi.removeConversation(id),
  onSuccess: (_data, id) => {
    if (id === selectedId.value) {
      stream.abort()
      pendingUserMessage.value = null
      selectedId.value = null
      isDraft.value = false
      queuedMessages.value = []
    }
    deletingConv.value = null
    queryClient.invalidateQueries({ queryKey: ['conversations', agentId] })
    // selectedId 置空后，conversations watch 会自动选中剩下的最近一个
  },
})

const openDeleteConv = (conv: Conversation) => {
  deleteMutation.reset() // 清掉上次删除失败的错误态
  deletingConv.value = conv
}

// 离开页面断流 + 取消挂起的滚动帧/计时器
onBeforeUnmount(() => {
  stream.abort()
  if (scrollRaf != null) cancelAnimationFrame(scrollRaf)
  if (tickTimer != null) clearInterval(tickTimer)
})
</script>

<template>
  <div class="min-h-screen">
    <Navbar />

    <!-- chat-shell：左栏会话列表 + 右栏聊天窗口（对齐 design/agent-chat.html） -->
    <main class="h-[calc(100vh-64px)] grid grid-cols-[272px_1fr] max-md:grid-cols-[220px_1fr]">
      <!-- 左栏 -->
      <aside class="bg-surface border-r border-border flex flex-col min-h-0">
        <ConversationList
          :conversations="conversations"
          :selected-id="selectedId"
          :is-draft="isDraft"
          :is-loading="convLoading"
          :has-more="convHasMore ?? false"
          :is-fetching-more="convFetchingMore"
          @select="selectConversation"
          @new-conversation="startDraft"
          @load-more="fetchMoreConvs()"
          @remove="openDeleteConv"
        />
      </aside>

      <!-- 右栏 -->
      <section class="flex flex-col min-h-0">
        <!-- 头部 -->
        <header class="bg-surface border-b border-border px-5 py-3 flex items-center gap-3 shrink-0">
          <div class="w-9 h-9 rounded-[10px] bg-accent text-white grid place-items-center shrink-0">
            <AppIcon
              name="bot"
              :size="18"
            />
          </div>
          <div class="min-w-0">
            <div class="text-fg font-semibold text-sm truncate">
              {{ agent?.name ?? '...' }}
            </div>
            <div class="text-muted text-xs truncate">
              {{ agent?.modelName }}
            </div>
          </div>
          <div class="ml-auto flex items-center gap-2 shrink-0">
            <!-- 后台任务 pill（有任务才渲染；running 时呼吸点 + 5s 轮询） -->
            <BackgroundTasksPill
              :conversation-id="activeConvId"
              :agent-id="agentId"
            />
            <span
              v-if="agentDisabled"
              class="text-danger text-xs"
            >该 Agent 已停用</span>
          </div>
        </header>

        <!-- 消息区（relative 容器：挂「回到底部」悬浮钮） -->
        <div class="relative flex-1 min-h-0">
          <div
            ref="messagesEl"
            class="h-full overflow-y-auto"
            @scroll.passive="handleMessagesScroll"
          >
            <div class="max-w-[760px] mx-auto px-5 py-6 flex flex-col gap-[22px] min-h-full">
              <!-- 空态/草稿态欢迎屏（Kimi 首页式引导） -->
              <div
                v-if="(isDraft || !activeConvId) && !pendingUserMessage && !stream.streamingMessage.value"
                class="flex-1 flex flex-col items-center justify-center text-center"
              >
                <div class="w-14 h-14 rounded-2xl bg-accent text-white grid place-items-center mb-4">
                  <AppIcon
                    name="bot"
                    :size="26"
                  />
                </div>
                <h2 class="font-display font-bold text-lg text-fg mb-1.5">
                  开始和 {{ agent?.name ?? 'Agent' }} 对话
                </h2>
                <p class="text-muted text-sm mb-6 max-w-[420px]">
                  {{ isDraft ? (agent?.description || '输入你的问题，Agent 将为你解答') : '还没有会话，开始一个新的吧' }}
                </p>
                <!-- 草稿态：建议问题 chips，点击填入输入框 -->
                <div
                  v-if="isDraft"
                  class="flex flex-wrap items-center justify-center gap-2"
                >
                  <button
                    v-for="s in suggestions"
                    :key="s"
                    class="od-chip cursor-pointer"
                    @click="applySuggestion(s)"
                  >
                    {{ s }}
                  </button>
                </div>
                <button
                  v-else
                  class="od-btn od-btn-primary"
                  @click="startDraft"
                >
                  <AppIcon
                    name="plus"
                    :size="16"
                  />
                  新建会话
                </button>
              </div>

              <template v-else>
                <!-- 向上翻页 -->
                <div
                  v-if="msgHasMore"
                  class="text-center"
                >
                  <button
                    class="text-muted hover:text-fg text-xs transition-colors disabled:opacity-50"
                    :disabled="msgFetchingMore"
                    @click="fetchMoreMsgs()"
                  >
                    {{ msgFetchingMore ? '加载中...' : '加载更早的消息' }}
                  </button>
                </div>

                <!-- 历史消息（归组渲染，tool 消息已被配对进卡片） -->
                <MessageBubble
                  v-for="msg in grouped"
                  :key="msg.id"
                  :role="msg.role"
                  :content="msg.content"
                  :reasoning="msg.reasoning"
                  :tool-calls="msg.toolCalls"
                  :total-tokens="msg.totalTokens"
                  :agent-name="agent?.name || 'AI 助手'"
                />

                <!-- 发送中的 user 消息（乐观展示） -->
                <MessageBubble
                  v-if="pendingUserMessage"
                  class="anim-rise"
                  role="user"
                  :content="pendingUserMessage"
                />

                <!-- 流式临时 assistant 气泡 -->
                <MessageBubble
                  v-if="stream.streamingMessage.value"
                  class="anim-rise"
                  role="assistant"
                  :content="stream.streamingMessage.value.text"
                  :reasoning="stream.streamingMessage.value.reasoning"
                  :tool-calls="stream.streamingMessage.value.toolCalls"
                  :total-tokens="stream.streamingMessage.value.totalTokens"
                  :streaming="stream.streaming.value"
                  :has-error="stream.status.value === 'error'"
                  :agent-name="agent?.name || 'AI 助手'"
                />

                <!-- 轮次状态（DSH TurnStatus：流式超过 15s 显示深入思考提示 + 计时） -->
                <div
                  v-if="stream.streaming.value && turnElapsedMs >= 15000"
                  class="flex items-center gap-1.5 pl-11 text-xs text-muted/70"
                >
                  <AppIcon
                    name="clock"
                    :size="11"
                    class="od-breathe"
                  />
                  正在深入思考… {{ formatMmSs(turnElapsedMs) }}
                </div>

                <!-- 轮次页脚（DSH TurnTail：仅刚结束那轮展示，下次发送清空；
                     tok·s 按 totalTokens 计算（含输入 token），是近似值） -->
                <div
                  v-if="lastTurnMetrics && !stream.streaming.value"
                  class="pl-11 text-[11px] text-muted/60 tabular-nums"
                >
                  耗时 {{ (lastTurnMetrics.elapsedMs / 1000).toFixed(1) }}s
                  <template v-if="lastTurnMetrics.ttftMs != null">
                    · 首 token {{ (lastTurnMetrics.ttftMs / 1000).toFixed(1) }}s
                  </template>
                  <template v-if="lastTurnMetrics.totalTokens != null && lastTurnMetrics.elapsedMs > 0">
                    · {{ (lastTurnMetrics.totalTokens / (lastTurnMetrics.elapsedMs / 1000)).toFixed(1) }} tok·s
                  </template>
                </div>

                <!-- 错误与重试 -->
                <div
                  v-if="stream.status.value === 'error'"
                  class="flex items-center gap-3 justify-center"
                >
                  <span class="od-error !py-2 text-xs">{{ stream.errorMessage.value ?? '执行异常，请重试' }}</span>
                  <button
                    class="od-btn od-btn-soft !py-1.5 !px-3 text-xs"
                    @click="retrySend"
                  >
                    重试
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- 回到底部悬浮钮（上翻后出现，Kimi 式） -->
          <button
            v-show="!userNearBottom"
            class="absolute bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-surface border border-border shadow-lift grid place-items-center text-muted hover:text-fg transition-colors"
            title="回到底部"
            @click="scrollToBottom(true)"
          >
            <AppIcon
              name="chevron-down"
              :size="16"
            />
          </button>
        </div>

        <!-- 输入区（composer-box，对齐设计稿） -->
        <footer class="px-5 pb-5 pt-2 shrink-0">
          <div class="max-w-[760px] mx-auto">
            <p
              v-if="sendError"
              class="od-error !py-2 text-xs mb-2"
            >
              {{ sendError }}
            </p>
            <!-- 排队消息条（流式中继续发送的消息在此等待自动续发） -->
            <MessageQueueStrip
              :messages="queuedMessages"
              @remove="removeQueued"
              @edit="editQueued"
            />
            <div class="relative">
              <!-- 斜杠命令菜单（输入 / 开头时弹出） -->
              <SlashCommandMenu
                v-if="slashMenuOpen"
                :commands="slashCommands"
                :query="input"
                :active-index="slashActiveIndex"
                @select="runSlashCommand"
              />
              <div class="bg-surface border border-border rounded-2xl shadow-card transition-colors focus-within:border-accent-strong">
                <textarea
                  ref="inputEl"
                  v-model="input"
                  rows="1"
                  class="w-full bg-transparent resize-none outline-none px-4 pt-3.5 text-sm text-fg placeholder:text-muted/70 max-h-[180px]"
                  :placeholder="agentDisabled ? '该 Agent 已停用，无法发送' : '输入消息…（Enter 发送，Shift+Enter 换行，/ 命令）'"
                  :disabled="agentDisabled || (!activeConvId && !isDraft)"
                  @keydown.enter.exact="onEnterKey"
                  @keydown.up="onSlashNav"
                  @keydown.down="onSlashNav"
                  @keydown.escape="onSlashEsc"
                />
                <div class="flex items-center px-3 pb-3 pt-1.5">
                  <!-- 流式中：停止按钮 -->
                  <button
                    v-if="stream.streaming.value"
                    class="ml-auto w-[34px] h-[34px] rounded-full bg-danger text-white grid place-items-center transition hover:opacity-90"
                    title="停止生成"
                    @click="stopStreaming"
                  >
                    <AppIcon
                      name="square"
                      :size="13"
                    />
                  </button>
                  <button
                    v-else
                    class="ml-auto w-[34px] h-[34px] rounded-full bg-accent text-white grid place-items-center transition hover:-translate-y-px disabled:opacity-45 disabled:pointer-events-none"
                    title="发送"
                    :disabled="!input.trim() || agentDisabled || (!activeConvId && !isDraft)"
                    @click="sendMessage"
                  >
                    <AppIcon
                      name="send"
                      :size="15"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </main>

    <!-- 删除会话确认弹窗 -->
    <div
      v-if="deletingConv"
      class="od-modal-overlay"
      @click.self="deletingConv = null"
    >
      <div class="od-card w-full max-w-sm p-6">
        <h2 class="font-display text-lg font-bold text-fg mb-2">
          删除会话
        </h2>
        <p class="text-muted text-sm mb-6">
          确定删除「{{ deletingConv.title || '未命名会话' }}」吗？删除后消息记录不可恢复。
        </p>
        <p
          v-if="deleteMutation.isError.value"
          class="od-error mb-4"
        >
          删除失败，请稍后重试
        </p>
        <div class="flex gap-3">
          <button
            class="od-btn od-btn-ghost flex-1"
            @click="deletingConv = null"
          >
            取消
          </button>
          <button
            class="od-btn flex-1 bg-danger text-white hover:opacity-90"
            :disabled="deleteMutation.isPending.value"
            @click="deleteMutation.mutate(deletingConv.id)"
          >
            {{ deleteMutation.isPending.value ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
