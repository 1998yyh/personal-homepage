<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { channelsApi } from '../../lib/channels-api'
import type { AiChannelView, ChannelPayload } from '../../types/ai-generation'
import { ApiFormat } from '../../types/ai-generation'
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

const FORMAT_LABELS: Record<string, string> = {
  [ApiFormat.OpenAI]: 'OpenAI 兼容',
  [ApiFormat.Ark]: '火山方舟 Ark',
  [ApiFormat.Gemini]: 'Gemini',
}

const CAPABILITY_LABELS: Record<string, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
}

const capabilitySummary = (channel: AiChannelView) => {
  const set = new Set(channel.models.map((m) => m.capability))
  return [...set].map((c) => CAPABILITY_LABELS[c] ?? c).join(' / ')
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
  <div class="min-h-screen">
    <Navbar />

    <main class="max-w-[1280px] mx-auto px-6 py-10">
      <div class="flex items-end justify-between gap-4 flex-wrap mb-7">
        <div>
          <div class="eyebrow">
            AI Channels
          </div>
          <h1 class="font-display text-2xl font-bold tracking-[-0.01em] text-fg">
            AI 渠道
          </h1>
          <p class="text-muted text-sm mt-1.5">
            配置图片 / 视频 / 音频生成所用的接口渠道，画布生成从这里选模型
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

        <div
          v-else
          class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]"
        >
          <article
            v-for="channel in channels"
            :key="channel.id"
            class="od-card p-5 flex flex-col gap-3.5"
          >
            <div class="flex items-center gap-3">
              <div class="w-[42px] h-[42px] rounded-xl bg-accent text-white grid place-items-center shrink-0">
                <AppIcon
                  name="sliders"
                  :size="20"
                />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-fg font-semibold text-[15.5px] truncate">
                  {{ channel.name }}
                </h3>
                <p class="text-muted text-xs truncate mt-0.5">
                  {{ FORMAT_LABELS[channel.apiFormat] ?? channel.apiFormat }} · {{ capabilitySummary(channel) }}
                </p>
              </div>
              <span
                class="px-2 py-0.5 rounded-md text-xs font-medium shrink-0"
                :class="channel.isActive ? 'bg-accent-soft text-accent-strong' : 'bg-fg/5 text-muted'"
              >
                {{ channel.isActive ? '启用' : '停用' }}
              </span>
            </div>

            <div class="text-muted text-xs font-mono truncate">
              {{ channel.baseUrl }}
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="model in channel.models"
                :key="model.name"
                class="px-2 py-1 rounded-md bg-fg/5 text-muted text-xs"
              >
                {{ model.name }}
                <span class="text-accent-strong">{{ CAPABILITY_LABELS[model.capability] }}</span>
              </span>
            </div>

            <div class="flex justify-end gap-2 border-t border-border pt-3 mt-auto">
              <button
                class="od-icon-btn !w-9 !h-9"
                :title="channel.isActive ? '停用' : '启用'"
                :disabled="toggleMutation.isPending.value"
                @click="toggleMutation.mutate(channel)"
              >
                <AppIcon
                  :name="channel.isActive ? 'circle-dot' : 'refresh-cw'"
                  :size="15"
                />
              </button>
              <button
                class="od-icon-btn !w-9 !h-9"
                title="编辑"
                @click="openEdit(channel)"
              >
                <AppIcon
                  name="pencil"
                  :size="15"
                />
              </button>
              <button
                class="od-icon-btn !w-9 !h-9 hover:!text-danger hover:!border-danger/40"
                title="删除"
                @click="openDelete(channel)"
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
