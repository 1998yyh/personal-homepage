<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import agentsApi from '../../lib/agents-api'
import type { Agent, AgentPayload } from '../../types/agent'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import AgentFormDrawer from './components/AgentFormDrawer.vue'

const router = useRouter()
const queryClient = useQueryClient()

const { data, isLoading } = useQuery({
  queryKey: ['agents'],
  queryFn: () => agentsApi.list(),
})

// ---- 表单抽屉 ----
const showDrawer = ref(false)
const editingAgent = ref<Agent | null>(null)
const serverError = ref<string | null>(null)

const openCreate = () => {
  editingAgent.value = null
  serverError.value = null
  showDrawer.value = true
}

const openEdit = (agent: Agent) => {
  editingAgent.value = agent
  serverError.value = null
  showDrawer.value = true
}

const saveMutation = useMutation({
  mutationFn: (payload: AgentPayload) =>
    editingAgent.value
      ? agentsApi.update(editingAgent.value.id, payload)
      : agentsApi.create(payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['agents'] })
    showDrawer.value = false
  },
  onError: (e) => {
    serverError.value =
      (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
      '保存失败，请稍后重试'
  },
})

// ---- 删除（软删除，弹确认） ----
const deletingAgent = ref<Agent | null>(null)

const deleteMutation = useMutation({
  mutationFn: (id: string) => agentsApi.remove(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['agents'] })
    deletingAgent.value = null
  },
})

const openDelete = (agent: Agent) => {
  deleteMutation.reset() // 清掉上次删除失败的错误态
  deletingAgent.value = agent
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
}

const TOOL_LABELS: Record<string, string> = {
  web_search: '联网搜索',
  calculator: '计算器',
}
</script>

<template>
  <div class="min-h-screen">
    <Navbar />

    <main class="max-w-[1280px] mx-auto px-6 py-10">
      <!-- 页头（对齐 design/agent-admin.html：eyebrow + page-title + 新建按钮） -->
      <div class="flex items-end justify-between gap-4 flex-wrap mb-7">
        <div>
          <div class="eyebrow">
            Agents
          </div>
          <h1 class="font-display text-2xl font-bold tracking-[-0.01em] text-fg">
            Agent 管理
          </h1>
          <p class="text-muted text-sm mt-1.5">
            配置你自己的 AI 助手，支持联网搜索与工具调用
          </p>
        </div>
        <button
          class="od-btn od-btn-primary"
          @click="openCreate"
        >
          <AppIcon
            name="plus"
            :size="16"
          />
          新建 Agent
        </button>
      </div>

      <!-- 加载中 -->
      <div
        v-if="isLoading"
        class="text-muted text-center py-20"
      >
        加载中...
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!data?.items.length"
        class="od-card py-20 text-center"
      >
        <div class="w-14 h-14 rounded-2xl bg-accent text-white grid place-items-center mx-auto mb-4">
          <AppIcon
            name="bot"
            :size="26"
          />
        </div>
        <p class="text-fg font-medium mb-1.5">
          还没有 Agent
        </p>
        <p class="text-muted text-sm mb-6">
          创建一个，填入你的 API Key 就能开始对话
        </p>
        <button
          class="od-btn od-btn-primary mx-auto"
          @click="openCreate"
        >
          <AppIcon
            name="plus"
            :size="16"
          />
          新建 Agent
        </button>
      </div>

      <!-- Agent 卡片网格 -->
      <div
        v-else
        class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]"
      >
        <article
          v-for="agent in data.items"
          :key="agent.id"
          class="od-card p-5 flex flex-col gap-3.5 cursor-pointer transition-shadow hover:shadow-lift group"
          @click="router.push(`/agents/${agent.id}`)"
        >
          <!-- 头部：avatar + 名称/模型 -->
          <div class="flex items-center gap-3">
            <div class="w-[42px] h-[42px] rounded-xl bg-accent text-white grid place-items-center shrink-0">
              <AppIcon
                name="bot"
                :size="20"
              />
            </div>
            <div class="min-w-0">
              <h3 class="text-fg font-semibold text-[15.5px] truncate">
                {{ agent.name }}
              </h3>
              <p class="text-muted text-xs truncate mt-0.5">
                {{ agent.model }}
              </p>
            </div>
          </div>

          <p class="text-muted text-sm line-clamp-2 min-h-[2.5rem]">
            {{ agent.description || '暂无描述' }}
          </p>

          <!-- 标签 -->
          <div class="flex flex-wrap gap-2">
            <span class="px-2 py-1 rounded-md bg-accent-soft text-accent-strong text-xs font-medium">
              {{ PROVIDER_LABELS[agent.provider] ?? agent.provider }}
            </span>
            <span
              v-for="tool in agent.enabledTools"
              :key="tool"
              class="px-2 py-1 rounded-md bg-fg/5 text-muted text-xs"
            >
              {{ TOOL_LABELS[tool] ?? tool }}
            </span>
          </div>

          <!-- 底部操作 -->
          <div
            class="flex justify-end gap-2 border-t border-border pt-3 mt-auto"
            @click.stop
          >
            <button
              class="od-icon-btn !w-9 !h-9"
              title="编辑"
              @click="openEdit(agent)"
            >
              <AppIcon
                name="pencil"
                :size="15"
              />
            </button>
            <button
              class="od-icon-btn !w-9 !h-9 hover:!text-danger hover:!border-danger/40"
              title="删除"
              @click="openDelete(agent)"
            >
              <AppIcon
                name="trash-2"
                :size="15"
              />
            </button>
          </div>
        </article>
      </div>
    </main>

    <!-- 创建/编辑抽屉 -->
    <AgentFormDrawer
      v-if="showDrawer"
      :agent="editingAgent"
      :submitting="saveMutation.isPending.value"
      :server-error="serverError"
      @close="showDrawer = false"
      @submit="saveMutation.mutate($event)"
    />

    <!-- 删除确认弹窗 -->
    <div
      v-if="deletingAgent"
      class="od-modal-overlay"
      @click.self="deletingAgent = null"
    >
      <div class="od-card w-full max-w-sm p-6">
        <h2 class="font-display text-lg font-bold text-fg mb-2">
          删除 Agent
        </h2>
        <p class="text-muted text-sm mb-6">
          确定删除「{{ deletingAgent.name }}」吗？删除后将无法在列表中使用。
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
            @click="deletingAgent = null"
          >
            取消
          </button>
          <button
            class="od-btn flex-1 bg-danger text-white hover:opacity-90"
            :disabled="deleteMutation.isPending.value"
            @click="deleteMutation.mutate(deletingAgent.id)"
          >
            {{ deleteMutation.isPending.value ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
