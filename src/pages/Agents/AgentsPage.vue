<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import agentsApi from '../../lib/agents-api'
import type { Agent, AgentPayload } from '../../types/agent'
import Navbar from '../../components/Navbar.vue'
import AgentFormModal from './components/AgentFormModal.vue'

const router = useRouter()
const queryClient = useQueryClient()

const { data, isLoading } = useQuery({
  queryKey: ['agents'],
  queryFn: () => agentsApi.list(),
})

// ---- 表单弹窗 ----
const showModal = ref(false)
const editingAgent = ref<Agent | null>(null)
const serverError = ref<string | null>(null)

const openCreate = () => {
  editingAgent.value = null
  serverError.value = null
  showModal.value = true
}

const openEdit = (agent: Agent) => {
  editingAgent.value = agent
  serverError.value = null
  showModal.value = true
}

const saveMutation = useMutation({
  mutationFn: (payload: AgentPayload) =>
    editingAgent.value
      ? agentsApi.update(editingAgent.value.id, payload)
      : agentsApi.create(payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['agents'] })
    showModal.value = false
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

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
}
</script>

<template>
  <div class="min-h-screen bg-mesh relative overflow-hidden">
    <div class="orb orb-1" />
    <div class="orb orb-2" />
    <div class="orb orb-3" />

    <Navbar />

    <main class="relative z-10 max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-display font-bold text-white">
            我的 Agent
          </h1>
          <p class="text-white/50 text-sm mt-1">
            配置你自己的 AI 助手，支持联网搜索与工具调用
          </p>
        </div>
        <button
          class="btn-primary !w-auto px-6 !py-2.5"
          @click="openCreate"
        >
          + 新建 Agent
        </button>
      </div>

      <!-- 加载中 -->
      <div
        v-if="isLoading"
        class="text-white/50 text-center py-20"
      >
        加载中...
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!data?.items.length"
        class="glass-dark rounded-2xl py-20 text-center"
      >
        <div class="text-5xl mb-4">
          🧠
        </div>
        <p class="text-white/60 mb-2">
          还没有 Agent
        </p>
        <p class="text-white/40 text-sm mb-6">
          创建一个，填入你的 API Key 就能开始对话
        </p>
        <button
          class="btn-primary !w-auto px-6 !py-2.5"
          @click="openCreate"
        >
          + 新建 Agent
        </button>
      </div>

      <!-- Agent 卡片列表 -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="agent in data.items"
          :key="agent.id"
          class="glass-dark rounded-2xl p-5 cursor-pointer hover:border-primary-500/40 transition-all group"
          @click="router.push(`/agents/${agent.id}`)"
        >
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-white font-semibold text-lg group-hover:text-primary-300 transition-colors">
              {{ agent.name }}
            </h3>
            <div
              class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop
            >
              <button
                class="text-white/50 hover:text-white text-sm transition-colors"
                @click="openEdit(agent)"
              >
                编辑
              </button>
              <button
                class="text-red-400/70 hover:text-red-400 text-sm transition-colors"
                @click="deletingAgent = agent"
              >
                删除
              </button>
            </div>
          </div>

          <p class="text-white/50 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
            {{ agent.description || '暂无描述' }}
          </p>

          <div class="flex flex-wrap gap-2">
            <span class="px-2 py-1 rounded-md bg-primary-500/15 text-primary-300 text-xs">
              {{ PROVIDER_LABELS[agent.provider] ?? agent.provider }}
            </span>
            <span class="px-2 py-1 rounded-md bg-white/5 text-white/60 text-xs">
              {{ agent.model }}
            </span>
            <span
              v-if="agent.enabledTools.includes('web_search')"
              class="px-2 py-1 rounded-md bg-white/5 text-white/60 text-xs"
            >
              🔍 联网搜索
            </span>
            <span
              v-if="agent.enabledTools.includes('calculator')"
              class="px-2 py-1 rounded-md bg-white/5 text-white/60 text-xs"
            >
              🧮 计算器
            </span>
          </div>
        </div>
      </div>
    </main>

    <!-- 创建/编辑弹窗 -->
    <AgentFormModal
      v-if="showModal"
      :agent="editingAgent"
      :submitting="saveMutation.isPending.value"
      :server-error="serverError"
      @close="showModal = false"
      @submit="saveMutation.mutate($event)"
    />

    <!-- 删除确认弹窗 -->
    <div
      v-if="deletingAgent"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      @click.self="deletingAgent = null"
    >
      <div class="glass-dark rounded-2xl w-full max-w-sm p-6">
        <h2 class="text-lg font-display font-bold text-white mb-2">
          删除 Agent
        </h2>
        <p class="text-white/60 text-sm mb-6">
          确定删除「{{ deletingAgent.name }}」吗？删除后将无法在列表中使用。
        </p>
        <div class="flex gap-3">
          <button
            class="flex-1 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            @click="deletingAgent = null"
          >
            取消
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
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
