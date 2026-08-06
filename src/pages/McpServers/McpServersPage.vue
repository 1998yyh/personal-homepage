<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import mcpServersApi from '../../lib/mcp-servers-api'
import type { McpServer, McpServerPayload, McpServerType } from '../../types/mcp-server'
import { useAuthStore } from '../../stores/auth'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal.vue'
import McpServerFormDrawer from './components/McpServerFormDrawer.vue'

const router = useRouter()
const auth = useAuthStore()
const queryClient = useQueryClient()

// ---- 列表：类型筛选走接口（?type=），名称搜索走前端 ----
const typeFilter = ref<McpServerType | ''>('')
const keyword = ref('')

const { data, isLoading } = useQuery({
  queryKey: ['mcp-servers', typeFilter],
  queryFn: () => mcpServersApi.list(typeFilter.value || undefined),
  enabled: computed(() => auth.isAuthenticated),
})

const filteredItems = computed(() => {
  const items = data.value?.items ?? []
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return items
  return items.filter(
    (s) =>
      s.name.toLowerCase().includes(kw) ||
      (s.description ?? '').toLowerCase().includes(kw),
  )
})

const TYPE_TABS: Array<{ value: McpServerType | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'stdio', label: 'stdio' },
  { value: 'sse', label: 'sse' },
  { value: 'streamable-http', label: 'streamable-http' },
]

const TYPE_LABELS: Record<McpServerType, string> = {
  stdio: 'stdio',
  sse: 'sse',
  'streamable-http': 'streamable-http',
}

/** 编辑/删除权限：创建者或管理员（与后端 403 规则一致） */
const canManage = (server: McpServer) =>
  !!auth.user && (auth.user.role === 'admin' || server.createdBy === auth.user.id)

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('zh-CN')

// ---- 表单抽屉 ----
const showDrawer = ref(false)
const editingServer = ref<McpServer | null>(null)
const serverError = ref<string | null>(null)

const openCreate = () => {
  editingServer.value = null
  serverError.value = null
  showDrawer.value = true
}

const openEdit = (server: McpServer) => {
  editingServer.value = server
  serverError.value = null
  showDrawer.value = true
}

const saveMutation = useMutation({
  mutationFn: (payload: McpServerPayload) =>
    editingServer.value
      ? mcpServersApi.update(editingServer.value.id, payload)
      : mcpServersApi.create(payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
    showDrawer.value = false
  },
  onError: (e) => {
    serverError.value =
      (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
      '保存失败，请稍后重试'
  },
})

// ---- 删除（弹确认，关联关系后端级联清理） ----
const deletingServer = ref<McpServer | null>(null)

const deleteMutation = useMutation({
  mutationFn: (id: string) => mcpServersApi.remove(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
    deletingServer.value = null
  },
})

const openDelete = (server: McpServer) => {
  deleteMutation.reset()
  deletingServer.value = server
}
</script>

<template>
  <div class="min-h-screen">
    <Navbar />

    <main class="max-w-[1280px] mx-auto px-6 py-10">
      <!-- 页头 -->
      <div class="flex items-end justify-between gap-4 flex-wrap mb-7">
        <div>
          <div class="eyebrow">
            MCP Servers
          </div>
          <h1 class="font-display text-2xl font-bold tracking-[-0.01em] text-fg">
            MCP 工具库
          </h1>
          <p class="text-muted text-sm mt-1.5">
            管理可连接的 MCP Server，配置后即可关联到 Agent / Skill
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
          新建 MCP Server
        </button>
      </div>

      <!-- 未登录：空态引导 -->
      <EmptyState
        v-if="!auth.isAuthenticated"
        icon="plug"
        title="登录后管理 MCP 工具库"
        description="MCP Server 是全局共享的工具连接，登录即可创建并关联到你的 Agent"
        action-text="去登录"
        @action="router.push({ path: '/login', query: { redirect: '/mcp-servers' } })"
      />

      <template v-else>
        <!-- 工具栏：类型筛选 + 搜索 -->
        <div class="flex items-center gap-3 flex-wrap mb-5">
          <div class="flex gap-2">
            <button
              v-for="tab in TYPE_TABS"
              :key="tab.value"
              class="od-chip cursor-pointer"
              :class="{ '!bg-accent !text-white': typeFilter === tab.value }"
              @click="typeFilter = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="relative ml-auto">
            <AppIcon
              name="search"
              :size="15"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              v-model="keyword"
              class="od-input !pl-9 !w-56 max-sm:!w-full"
              placeholder="搜索名称 / 描述"
            >
          </div>
        </div>

        <!-- 加载中 -->
        <div
          v-if="isLoading"
          class="text-muted text-center py-20"
        >
          加载中...
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="!filteredItems.length"
          icon="plug"
          :title="keyword || typeFilter ? '没有匹配的 MCP Server' : '还没有 MCP Server'"
          :description="keyword || typeFilter ? '换个筛选条件试试' : '创建一个，填入连接信息就能给 Agent 扩展工具能力'"
          :action-text="keyword || typeFilter ? undefined : '新建 MCP Server'"
          @action="openCreate"
        />

        <!-- 卡片网格 -->
        <div
          v-else
          class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]"
        >
          <article
            v-for="server in filteredItems"
            :key="server.id"
            class="od-card p-5 flex flex-col gap-3.5"
          >
            <!-- 头部：图标 + 名称/类型 -->
            <div class="flex items-center gap-3">
              <div
                class="w-[42px] h-[42px] rounded-xl grid place-items-center shrink-0"
                :class="server.type === 'stdio' ? 'bg-warn text-white' : 'bg-accent text-white'"
              >
                <AppIcon
                  name="plug"
                  :size="20"
                />
              </div>
              <div class="min-w-0">
                <h3 class="text-fg font-semibold text-[15.5px] truncate">
                  {{ server.name }}
                </h3>
                <p class="text-muted text-xs truncate mt-0.5">
                  创建于 {{ formatDate(server.createdAt) }}
                </p>
              </div>
            </div>

            <p class="text-muted text-sm line-clamp-2 min-h-[2.5rem]">
              {{ server.description || '暂无描述' }}
            </p>

            <!-- 连接信息 -->
            <p class="text-xs text-muted font-mono truncate bg-fg/5 rounded-md px-2 py-1.5">
              <template v-if="server.type === 'stdio'">
                $ {{ server.command }} {{ (server.args ?? []).join(' ') }}
              </template>
              <template v-else>
                {{ server.url }}
              </template>
            </p>

            <!-- 标签 -->
            <div class="flex flex-wrap gap-2">
              <span class="px-2 py-1 rounded-md bg-accent-soft text-accent-strong text-xs font-medium">
                {{ TYPE_LABELS[server.type] }}
              </span>
              <span
                v-if="server.type === 'stdio'"
                class="px-2 py-1 rounded-md bg-fg/5 text-muted text-xs"
              >
                服务端子进程
              </span>
            </div>

            <!-- 底部操作（仅创建者或管理员可见） -->
            <div
              v-if="canManage(server)"
              class="flex justify-end gap-2 border-t border-border pt-3 mt-auto"
            >
              <button
                class="od-icon-btn !w-9 !h-9"
                title="编辑"
                @click="openEdit(server)"
              >
                <AppIcon
                  name="pencil"
                  :size="15"
                />
              </button>
              <button
                class="od-icon-btn !w-9 !h-9 hover:!text-danger hover:!border-danger/40"
                title="删除"
                @click="openDelete(server)"
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

    <!-- 创建/编辑抽屉 -->
    <McpServerFormDrawer
      v-if="showDrawer"
      :server="editingServer"
      :submitting="saveMutation.isPending.value"
      :server-error="serverError"
      @close="showDrawer = false"
      @submit="saveMutation.mutate($event)"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDeleteModal
      v-if="deletingServer"
      title="删除 MCP Server"
      :message="`确定删除「${deletingServer.name}」吗？它与 Agent / Skill 的关联会一并解除。`"
      :deleting="deleteMutation.isPending.value"
      :error="deleteMutation.isError.value"
      @cancel="deletingServer = null"
      @confirm="deleteMutation.mutate(deletingServer.id)"
    />
  </div>
</template>
