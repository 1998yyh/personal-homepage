<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import agentsApi from '../../lib/agents-api'
import type { Conversation } from '../../types/agent'
import { useAgentStream } from '../../composables/useAgentStream'
import { groupMessages } from './utils/groupMessages'
import Navbar from '../../components/Navbar.vue'
import ConversationList from './components/ConversationList.vue'
import MessageBubble from './components/MessageBubble.vue'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()

const agentId = route.params.id as string

// ---- Agent 详情（标题展示 + 停用判断） ----
const { data: agent, error: agentError } = useQuery({
  queryKey: ['agents', agentId],
  queryFn: () => agentsApi.getById(agentId),
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
  queryKey: ['conversations', agentId],
  queryFn: ({ pageParam }) => agentsApi.listConversations(agentId, pageParam),
  initialPageParam: 1,
  getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
})
const conversations = computed(() => convData.value?.pages.flatMap((p) => p.items) ?? [])

// ---- 会话选中：null = 未选；草稿态由 isDraft 标记 ----
const selectedId = ref<string | null>(null)
const isDraft = ref(false)

// 列表加载后：优先按 ?c= 定位，无则自动选最近一个（immediate 必须——CLAUDE.md 规范）
watch(
  conversations,
  (list) => {
    if (!list.length || selectedId.value) return
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
}

// ---- 新建会话：懒创建，首条消息发出时才 POST（设计文档 §7） ----
const startDraft = () => {
  if (stream.streaming.value) stream.abort()
  selectedId.value = null
  isDraft.value = true
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
const messagesEl = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
}

// 新消息/流式输出时自动滚底
watch([() => grouped.value.length, () => stream.streamingMessage.value?.text], scrollToBottom)

const sendMessage = async () => {
  const content = input.value.trim()
  if (!content || stream.streaming.value || agentDisabled.value) return

  // 草稿态：先建真实会话
  let convId = activeConvId.value
  if (!convId) {
    const conv: Conversation = await agentsApi.createConversation(agentId)
    convId = conv.id
    isDraft.value = false
    selectedId.value = conv.id
    queryClient.invalidateQueries({ queryKey: ['conversations', agentId] })
  }

  input.value = ''
  pendingUserMessage.value = content
  scrollToBottom()

  await stream.send(convId, content, () => {
    // message_end：消息列表归位后清理临时状态（历史里已有 user+assistant）
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['messages', convId] }),
      queryClient.invalidateQueries({ queryKey: ['conversations', agentId] }),
    ]).then(() => {
      pendingUserMessage.value = null
      stream.reset()
    })
  })

  // error 状态保留 pendingUserMessage 与已生成文本，等用户重试或放弃
  if (stream.status.value !== 'error') {
    pendingUserMessage.value = null
  }
}

const retrySend = async () => {
  const convId = activeConvId.value
  if (!convId || stream.streaming.value) return
  await stream.retry(convId, () => {
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['messages', convId] }),
      queryClient.invalidateQueries({ queryKey: ['conversations', agentId] }),
    ]).then(() => {
      pendingUserMessage.value = null
      stream.reset()
    })
  })
  if (stream.status.value !== 'error') {
    pendingUserMessage.value = null
  }
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

// 离开页面断流
onBeforeUnmount(() => stream.abort())
</script>

<template>
  <div class="min-h-screen bg-mesh relative overflow-hidden">
    <div class="orb orb-1" />
    <div class="orb orb-2" />
    <div class="orb orb-3" />

    <Navbar />

    <main class="relative z-10 max-w-7xl mx-auto px-4 py-4">
      <div class="flex gap-6 h-[calc(100vh-88px)]">
        <!-- 左侧：会话列表 -->
        <div class="w-56 flex-shrink-0 glass-dark rounded-xl overflow-hidden">
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
            @remove="deletingConv = $event"
          />
        </div>

        <!-- 右侧：聊天窗口 -->
        <div class="flex-1 glass-dark rounded-xl overflow-hidden flex flex-col">
          <!-- 头部 -->
          <div class="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
            <span class="text-xl">🧠</span>
            <div>
              <div class="text-white font-medium">
                {{ agent?.name ?? '...' }}
              </div>
              <div class="text-white/40 text-xs">
                {{ agent?.model }}
              </div>
            </div>
            <span
              v-if="agentDisabled"
              class="ml-auto text-red-400/80 text-xs"
            >该 Agent 已停用</span>
          </div>

          <!-- 消息区 -->
          <div
            ref="messagesEl"
            class="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          >
            <!-- 空状态 -->
            <div
              v-if="!activeConvId && !isDraft"
              class="h-full flex flex-col items-center justify-center text-center"
            >
              <div class="text-4xl mb-3">
                💬
              </div>
              <p class="text-white/50 text-sm mb-4">
                还没有会话，开始一个新的吧
              </p>
              <button
                class="btn-primary !w-auto px-6 !py-2"
                @click="startDraft"
              >
                + 新建会话
              </button>
            </div>

            <template v-else>
              <!-- 向上翻页 -->
              <div
                v-if="msgHasMore"
                class="text-center"
              >
                <button
                  class="text-white/40 hover:text-white/70 text-xs transition-colors disabled:opacity-50"
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
              />

              <!-- 发送中的 user 消息（乐观展示） -->
              <MessageBubble
                v-if="pendingUserMessage"
                role="user"
                :content="pendingUserMessage"
              />

              <!-- 流式临时 assistant 气泡 -->
              <MessageBubble
                v-if="stream.streamingMessage.value"
                role="assistant"
                :content="stream.streamingMessage.value.text"
                :tool-calls="stream.streamingMessage.value.toolCalls"
                :total-tokens="stream.streamingMessage.value.totalTokens"
                :streaming="stream.streaming.value"
                :has-error="stream.status.value === 'error'"
              />

              <!-- 错误与重试 -->
              <div
                v-if="stream.status.value === 'error'"
                class="flex items-center gap-3 justify-center"
              >
                <span class="text-red-400/90 text-sm">{{ stream.errorMessage.value ?? '执行异常，请重试' }}</span>
                <button
                  class="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs hover:bg-red-500/30 transition-colors"
                  @click="retrySend"
                >
                  重试
                </button>
              </div>
            </template>
          </div>

          <!-- 输入区 -->
          <div class="px-5 py-4 border-t border-white/[0.06]">
            <div class="flex gap-3 items-end">
              <textarea
                v-model="input"
                class="input-glass resize-none flex-1 !py-2.5"
                rows="1"
                :placeholder="agentDisabled ? '该 Agent 已停用，无法发送' : '输入消息，Enter 发送，Shift+Enter 换行'"
                :disabled="stream.streaming.value || agentDisabled || (!activeConvId && !isDraft)"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <button
                class="btn-primary !w-auto px-6 !py-2.5 disabled:opacity-40 disabled:pointer-events-none"
                :disabled="!input.trim() || stream.streaming.value || agentDisabled || (!activeConvId && !isDraft)"
                @click="sendMessage"
              >
                {{ stream.streaming.value ? '回复中...' : '发送' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 删除会话确认弹窗 -->
    <div
      v-if="deletingConv"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      @click.self="deletingConv = null"
    >
      <div class="glass-dark rounded-2xl w-full max-w-sm p-6">
        <h2 class="text-lg font-display font-bold text-white mb-2">
          删除会话
        </h2>
        <p class="text-white/60 text-sm mb-6">
          确定删除「{{ deletingConv.title || '未命名会话' }}」吗？删除后消息记录不可恢复。
        </p>
        <div class="flex gap-3">
          <button
            class="flex-1 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            @click="deletingConv = null"
          >
            取消
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
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
