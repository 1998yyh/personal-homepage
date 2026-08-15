<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import agentsApi from '../../lib/agents-api'
import type { Conversation } from '../../types/agent'
import { useAgentStream } from '../../composables/useAgentStream'
import { groupMessages } from './utils/groupMessages'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import ConversationList from './components/ConversationList.vue'
import MessageBubble from './components/MessageBubble.vue'

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
  if (stream.streaming.value) stream.abort() // 切换会话断流
  isDraft.value = false
  selectedId.value = id
  userNearBottom.value = true // 切会话后重新跟随吸底
}

// ---- 新建会话：懒创建，首条消息发出时才 POST（设计文档 §7） ----
const startDraft = () => {
  if (stream.streaming.value) stream.abort()
  selectedId.value = null
  isDraft.value = true
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

const input = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const messagesEl = ref<HTMLElement | null>(null)
/** 建会话等发送前置步骤的错误（流内错误走 stream.errorMessage） */
const sendError = ref<string | null>(null)

// 智能滚动（Kimi 式）：用户在底部附近时新内容才吸底，上翻看历史不被拽回去
const userNearBottom = ref(true)

const scrollToBottom = (force = false) => {
  if (force) userNearBottom.value = true
  nextTick(() => {
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
  void sendMessage()
}

const sendMessage = async () => {
  const content = input.value.trim()
  if (!content || stream.streaming.value || agentDisabled.value) return
  sendError.value = null

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
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['messages', convId] }),
      queryClient.invalidateQueries({ queryKey: ['conversations', agentId.value] }),
    ]).then(() => {
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

// 停止生成：断流后拉一次消息列表，与后端断连时的落库状态对齐
// （后端落库时机后移，已生成内容可能已持久化也可能被丢弃，以拉回的为准）
const stopStreaming = () => {
  const convId = activeConvId.value
  stream.abort()
  pendingUserMessage.value = null
  if (convId) {
    queryClient.invalidateQueries({ queryKey: ['messages', convId] })
    queryClient.invalidateQueries({ queryKey: ['conversations', agentId] })
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

// 离开页面断流
onBeforeUnmount(() => stream.abort())
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
          <span
            v-if="agentDisabled"
            class="ml-auto text-danger text-xs shrink-0"
          >该 Agent 已停用</span>
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
                  :tool-calls="stream.streamingMessage.value.toolCalls"
                  :total-tokens="stream.streamingMessage.value.totalTokens"
                  :streaming="stream.streaming.value"
                  :has-error="stream.status.value === 'error'"
                  :agent-name="agent?.name || 'AI 助手'"
                />

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
            <div class="bg-surface border border-border rounded-2xl shadow-card transition-colors focus-within:border-accent-strong">
              <textarea
                ref="inputEl"
                v-model="input"
                rows="1"
                class="w-full bg-transparent resize-none outline-none px-4 pt-3.5 text-sm text-fg placeholder:text-muted/70 max-h-[180px]"
                :placeholder="agentDisabled ? '该 Agent 已停用，无法发送' : '输入消息…（Enter 发送，Shift+Enter 换行）'"
                :disabled="stream.streaming.value || agentDisabled || (!activeConvId && !isDraft)"
                @keydown.enter.exact="onEnterKey"
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
