<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { channelsApi } from '../../lib/channels-api'
import type { AiChannelView, ChannelPayload } from '../../types/ai-generation'
import { ApiFormat, ModelCapability } from '../../types/ai-generation'
import { useAuthStore } from '../../stores/auth'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal.vue'
import ChannelFormDrawer from './components/ChannelFormDrawer.vue'

const router = useRouter()
const auth = useAuthStore()
const queryClient = useQueryClient()

const { data: channels, isLoading } = useQuery({
  queryKey: ['ai-channels'],
  queryFn: () => channelsApi.list(),
  enabled: computed(() => auth.isAuthenticated),
})

const CAPABILITY_LABELS: Record<string, string> = {
  [ModelCapability.Video]: '视频',
  [ModelCapability.Image]: '图片',
  [ModelCapability.Chat]: '对话',
  [ModelCapability.Audio]: '音频',
}

const CAPABILITY_ORDER: Array<(typeof ModelCapability)[keyof typeof ModelCapability]> = [
  ModelCapability.Video,
  ModelCapability.Image,
  ModelCapability.Chat,
  ModelCapability.Audio,
]

const FORMAT_LABELS: Record<string, string> = {
  [ApiFormat.OpenAI]: 'OpenAI',
  [ApiFormat.Ark]: 'Ark',
  [ApiFormat.Gemini]: 'Gemini',
  [ApiFormat.Anthropic]: 'Anthropic',
}

const CAP_TABS: Array<{ value: (typeof ModelCapability)[keyof typeof ModelCapability] | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: ModelCapability.Video, label: '视频' },
  { value: ModelCapability.Image, label: '图片' },
  { value: ModelCapability.Chat, label: '对话' },
  { value: ModelCapability.Audio, label: '音频' },
]

/** 按用途筛选，不按用途拆栏——同一渠道只出现一次，避免多用途模型被重复列出 */
const capFilter = ref<(typeof ModelCapability)[keyof typeof ModelCapability] | ''>('')

const filteredChannels = computed(() => {
  const list = channels.value ?? []
  if (!capFilter.value) return list
  const cap = capFilter.value
  return list.filter((ch) => ch.models.some((m) => m.capability === cap))
})

const capChips = (channel: AiChannelView) =>
  CAPABILITY_ORDER.filter((c) => channel.models.some((m) => m.capability === c)).map(
    (c) => CAPABILITY_LABELS[c],
  )

/** 渠道名已展示时，同名的唯一模型不再重复成 chip */
const extraModelNames = (channel: AiChannelView) => {
  const names = [...new Set(channel.models.map((m) => m.name))]
  if (names.length === 1 && names[0] === channel.name) return []
  return names.slice(0, 3)
}

// ---- 表单抽屉 ----
const showDrawer = ref(false)
const editingChannel = ref<AiChannelView | null>(null)
const serverError = ref<string | null>(null)

const openCreate = () => {
  editingChannel.value = null
  serverError.value = null
  showDrawer.value = true
}

const openEdit = (channel: AiChannelView) => {
  editingChannel.value = channel
  serverError.value = null
  showDrawer.value = true
}

const saveMutation = useMutation({
  mutationFn: (payload: ChannelPayload) =>
    editingChannel.value
      ? channelsApi.update(editingChannel.value.id, payload)
      : channelsApi.create(payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['ai-channels'] })
    showDrawer.value = false
  },
  onError: (e) => {
    serverError.value =
      (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
      '保存失败，请稍后重试'
  },
})

// ---- 启用切换 ----
const toggleMutation = useMutation({
  mutationFn: (channel: AiChannelView) =>
    channelsApi.update(channel.id, { isActive: !channel.isActive }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-channels'] }),
})

// ---- 删除 ----
const deletingChannel = ref<AiChannelView | null>(null)

/** 删除被 Agent 引用时的冲突清单（后端 400 响应带出） */
const conflictAgents = ref<Array<{ id: string; name: string }> | null>(null)

const deleteMutation = useMutation({
  mutationFn: (id: string) => channelsApi.remove(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['ai-channels'] })
    deletingChannel.value = null
  },
  onError: (e) => {
    const data = (
      e as { response?: { data?: { referencingAgents?: Array<{ id: string; name: string }> } } }
    ).response?.data
    if (data?.referencingAgents?.length) {
      deletingChannel.value = null
      conflictAgents.value = data.referencingAgents
    }
    // 其他错误（网络/权限）复用 ConfirmDeleteModal 自身错误展示，deletingChannel 保持打开
  },
})

const openDelete = (channel: AiChannelView) => {
  deleteMutation.reset()
  deletingChannel.value = channel
}
</script>

<template>
  <div class="min-h-screen max-w-[100vw] overflow-x-hidden">
    <Navbar />

    <main class="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 min-w-0">
      <div class="flex items-end justify-between gap-4 flex-wrap mb-7">
        <div>
          <div class="eyebrow">
            AI Channels
          </div>
          <h1 class="font-display text-2xl font-bold tracking-[-0.01em] text-fg">
            AI 渠道
          </h1>
          <p class="text-muted text-sm mt-1.5">
            按视频 / 图片 / 对话用途配置接口渠道，画布与 Agent 从这里选模型
          </p>
        </div>
        <button
          v-if="auth.isAuthenticated"
          class="od-btn od-btn-primary"
          @click="openCreate"
        >
          <AppIcon
            name="plus"
            :size="16"
          />
          新建渠道
        </button>
      </div>

      <EmptyState
        v-if="!auth.isAuthenticated"
        icon="sliders"
        title="登录后管理 AI 渠道"
        description="渠道是生成接口的端点配置（地址 + Key + 模型清单），登录即可创建"
        action-text="去登录"
        @action="router.push({ path: '/login', query: { redirect: '/channels' } })"
      />

      <template v-else>
        <div
          v-if="isLoading"
          class="text-muted text-center py-20"
        >
          加载中...
        </div>

        <EmptyState
          v-else-if="!channels?.length"
          icon="sliders"
          title="还没有 AI 渠道"
          description="创建一个渠道，配置好接口地址与模型就能在画布中生成内容"
          action-text="新建渠道"
          @action="openCreate"
        />

        <template v-else>
          <div class="flex gap-2 flex-wrap mb-5">
            <button
              v-for="tab in CAP_TABS"
              :key="tab.value || 'all'"
              type="button"
              class="od-btn !px-3.5 !py-1.5 text-sm"
              :class="capFilter === tab.value ? 'od-btn-primary' : 'od-btn-ghost'"
              @click="capFilter = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>

          <EmptyState
            v-if="!filteredChannels.length"
            icon="sliders"
            title="没有匹配的渠道"
            description="换个用途筛选试试"
          />

          <div
            v-else
            class="grid grid-cols-1 gap-2.5"
            :class="filteredChannels.length > 1 ? 'lg:grid-cols-2' : ''"
          >
            <article
              v-for="channel in filteredChannels"
              :key="channel.id"
              class="od-card relative min-w-0 w-full px-4 sm:px-5 py-3.5 sm:pr-[132px] flex flex-col gap-2 cursor-pointer transition-shadow duration-200 hover:shadow-lift"
              :class="channel.isActive ? '' : 'opacity-70'"
              @click="openEdit(channel)"
            >
              <div class="min-w-0 flex items-center gap-2">
                <h3 class="min-w-0 text-fg font-semibold text-[15px] truncate">
                  {{ channel.name }}
                </h3>
                <span
                  class="px-2 py-0.5 rounded-md text-xs font-medium shrink-0"
                  :class="channel.isActive ? 'bg-accent-soft text-accent-strong' : 'bg-fg/5 text-muted'"
                >
                  {{ channel.isActive ? '启用' : '停用' }}
                </span>
                <span class="hidden sm:inline px-2 py-0.5 rounded-md bg-fg/5 text-muted text-xs shrink-0">
                  {{ FORMAT_LABELS[channel.apiFormat] ?? channel.apiFormat }}
                </span>
              </div>
              <p
                class="text-muted text-xs font-mono truncate"
                :title="channel.baseUrl"
              >
                {{ channel.baseUrl }}
              </p>
              <div
                v-if="capChips(channel).length || extraModelNames(channel).length"
                class="flex flex-wrap gap-1.5 min-w-0"
              >
                <span
                  v-for="label in capChips(channel)"
                  :key="label"
                  class="px-2 py-0.5 rounded-md bg-accent-soft text-accent-strong text-xs font-medium"
                >
                  {{ label }}
                </span>
                <span
                  v-for="name in extraModelNames(channel)"
                  :key="name"
                  class="px-2 py-0.5 rounded-md bg-fg/5 text-muted text-xs font-mono max-w-[180px] truncate"
                  :title="name"
                >
                  {{ name }}
                </span>
              </div>

              <div class="flex gap-1.5 self-end sm:absolute sm:top-3.5 sm:right-4 sm:self-auto">
                <button
                  type="button"
                  class="od-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9"
                  :class="channel.isActive ? 'text-accent-strong' : 'text-muted'"
                  :title="channel.isActive ? '停用' : '启用'"
                  :aria-label="channel.isActive ? '停用' : '启用'"
                  :disabled="toggleMutation.isPending.value"
                  @click.stop="toggleMutation.mutate(channel)"
                >
                  <AppIcon
                    :name="channel.isActive ? 'circle-dot' : 'refresh-cw'"
                    :size="15"
                  />
                </button>
                <button
                  type="button"
                  class="od-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9"
                  title="编辑"
                  aria-label="编辑"
                  @click.stop="openEdit(channel)"
                >
                  <AppIcon
                    name="pencil"
                    :size="15"
                  />
                </button>
                <button
                  type="button"
                  class="od-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9 hover:!text-danger hover:!border-danger/40"
                  title="删除"
                  aria-label="删除"
                  @click.stop="openDelete(channel)"
                >
                  <AppIcon
                    name="trash-2"
                    :size="15"
                  />
                </button>
              </div>
            </article>
          </div>
        </template>
      </template>
    </main>

    <ChannelFormDrawer
      v-if="showDrawer"
      :channel="editingChannel"
      :submitting="saveMutation.isPending.value"
      :server-error="serverError"
      @close="showDrawer = false"
      @submit="saveMutation.mutate($event)"
    />

    <ConfirmDeleteModal
      v-if="deletingChannel"
      title="删除渠道"
      :message="`确定删除「${deletingChannel.name}」吗？相关的生成历史记录会保留，但无法再用它生成。`"
      :deleting="deleteMutation.isPending.value"
      :error="deleteMutation.isError.value"
      @cancel="deletingChannel = null"
      @confirm="deleteMutation.mutate(deletingChannel.id)"
    />

    <!-- 渠道删除冲突：列出引用它的 Agent -->
    <div
      v-if="conflictAgents"
      class="od-modal-overlay"
      @click.self="conflictAgents = null"
    >
      <div class="od-card p-6 w-[min(92vw,420px)] flex flex-col gap-4">
        <h3 class="font-display font-bold text-[16px] text-fg">
          无法删除渠道
        </h3>
        <p class="text-muted text-sm">
          该渠道正被以下 Agent 引用，请先修改它们的模型渠道或删除这些 Agent：
        </p>
        <ul class="flex flex-col gap-2">
          <li
            v-for="a in conflictAgents"
            :key="a.id"
          >
            <router-link
              :to="`/agents/${a.id}`"
              class="text-accent-strong text-sm font-medium hover:underline"
              @click="conflictAgents = null"
            >
              {{ a.name }} →
            </router-link>
          </li>
        </ul>
        <button
          class="od-btn od-btn-ghost"
          @click="conflictAgents = null"
        >
          知道了
        </button>
      </div>
    </div>
  </div>
</template>
