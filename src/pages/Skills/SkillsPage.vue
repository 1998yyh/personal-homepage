<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import skillsApi from '../../lib/skills-api'
import mcpServersApi from '../../lib/mcp-servers-api'
import type { Skill, SkillBuiltinToolName, SkillPayload } from '../../types/skill'
import { useAuthStore } from '../../stores/auth'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal.vue'
import SkillFormDrawer from './components/SkillFormDrawer.vue'

const router = useRouter()
const auth = useAuthStore()
const queryClient = useQueryClient()

// ---- 列表：前端名称搜索（后端无筛选参数） ----
const keyword = ref('')

const { data, isLoading } = useQuery({
  queryKey: ['skills'],
  queryFn: () => skillsApi.list(),
  enabled: computed(() => auth.isAuthenticated),
})

// MCP Server 列表（卡片上把 mcpServerIds 展示为名称；也供表单抽屉多选）
const { data: mcpData } = useQuery({
  queryKey: ['mcp-servers'],
  queryFn: () => mcpServersApi.list(),
  enabled: computed(() => auth.isAuthenticated),
})
const mcpNameMap = computed(() => new Map((mcpData.value?.items ?? []).map((s) => [s.id, s.name])))

const filteredItems = computed(() => {
  const items = data.value?.items ?? []
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return items
  return items.filter(
    (s) =>
      s.name.toLowerCase().includes(kw) ||
      s.description.toLowerCase().includes(kw),
  )
})

// 内置工具展示映射（后端无列表接口，前端硬编码——与 tool-names.ts 注册表对齐）
const TOOL_LABELS: Record<SkillBuiltinToolName, string> = {
  web_search: '联网搜索',
  calculator: '计算器',
  create_scheduled_task: '创建定时任务',
  write_daily_report: '写日报',
  list_scheduled_tasks: '查看定时任务',
  delete_scheduled_task: '删除定时任务',
}
const toolLabel = (name: string) => TOOL_LABELS[name as SkillBuiltinToolName] ?? name

/** 编辑/删除权限：创建者或管理员（与后端 403 规则一致） */
const canManage = (skill: Skill) =>
  !!auth.user && (auth.user.role === 'admin' || skill.createdBy === auth.user.id)

// ---- 表单抽屉 ----
const showDrawer = ref(false)
const editingSkill = ref<Skill | null>(null)
const serverError = ref<string | null>(null)

const openCreate = () => {
  editingSkill.value = null
  serverError.value = null
  showDrawer.value = true
}

const openEdit = (skill: Skill) => {
  editingSkill.value = skill
  serverError.value = null
  showDrawer.value = true
}

const saveMutation = useMutation({
  mutationFn: (payload: SkillPayload) =>
    editingSkill.value
      ? skillsApi.update(editingSkill.value.id, payload)
      : skillsApi.create(payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['skills'] })
    showDrawer.value = false
  },
  onError: (e) => {
    serverError.value =
      (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
      '保存失败，请稍后重试'
  },
})

// ---- 删除（弹确认，关联关系后端级联清理） ----
const deletingSkill = ref<Skill | null>(null)

const deleteMutation = useMutation({
  mutationFn: (id: string) => skillsApi.remove(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['skills'] })
    deletingSkill.value = null
  },
})

const openDelete = (skill: Skill) => {
  deleteMutation.reset()
  deletingSkill.value = skill
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
            Skills
          </div>
          <h1 class="font-display text-2xl font-bold tracking-[-0.01em] text-fg">
            Skills 库
          </h1>
          <p class="text-muted text-sm mt-1.5">
            管理可复用的子 Agent 工具，配置后即可关联到 Agent
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
          新建 Skill
        </button>
      </div>

      <!-- 未登录：空态引导 -->
      <EmptyState
        v-if="!auth.isAuthenticated"
        icon="zap"
        title="登录后管理 Skills 库"
        description="Skill 是带指令与工具集的子 Agent，登录即可创建并关联到你的 Agent"
        action-text="去登录"
        @action="router.push({ path: '/login', query: { redirect: '/skills' } })"
      />

      <template v-else>
        <!-- 工具栏：搜索 -->
        <div class="flex items-center gap-3 flex-wrap mb-5">
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
          icon="zap"
          :title="keyword ? '没有匹配的 Skill' : '还没有 Skill'"
          :description="keyword ? '换个关键词试试' : '创建一个，写好执行指令就能让 Agent 调用'"
          :action-text="keyword ? undefined : '新建 Skill'"
          @action="openCreate"
        />

        <!-- 卡片网格 -->
        <div
          v-else
          class="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]"
        >
          <article
            v-for="skill in filteredItems"
            :key="skill.id"
            class="od-card p-5 flex flex-col gap-3.5"
          >
            <!-- 头部：图标 + 名称 -->
            <div class="flex items-center gap-3">
              <div class="w-[42px] h-[42px] rounded-xl bg-accent text-white grid place-items-center shrink-0">
                <AppIcon
                  name="zap"
                  :size="20"
                />
              </div>
              <div class="min-w-0">
                <h3 class="text-fg font-semibold text-[15.5px] truncate font-mono">
                  {{ skill.name }}
                </h3>
                <p class="text-muted text-xs truncate mt-0.5">
                  {{ skill.mcpServerIds.length ? `${skill.mcpServerIds.length} 个 MCP Server` : '无 MCP 关联' }}
                </p>
              </div>
            </div>

            <p class="text-muted text-sm line-clamp-2 min-h-[2.5rem]">
              {{ skill.description }}
            </p>

            <!-- 标签：内置工具 + 关联 MCP 名称 -->
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tool in skill.enabledTools ?? []"
                :key="tool"
                class="px-2 py-1 rounded-md bg-accent-soft text-accent-strong text-xs font-medium"
              >
                {{ toolLabel(tool) }}
              </span>
              <span
                v-for="id in skill.mcpServerIds"
                :key="id"
                class="px-2 py-1 rounded-md bg-fg/5 text-muted text-xs"
              >
                {{ mcpNameMap.get(id) ?? id }}
              </span>
            </div>

            <!-- 底部操作（仅创建者或管理员可见） -->
            <div
              v-if="canManage(skill)"
              class="flex justify-end gap-2 border-t border-border pt-3 mt-auto"
            >
              <button
                class="od-icon-btn !w-9 !h-9"
                title="编辑"
                @click="openEdit(skill)"
              >
                <AppIcon
                  name="pencil"
                  :size="15"
                />
              </button>
              <button
                class="od-icon-btn !w-9 !h-9 hover:!text-danger hover:!border-danger/40"
                title="删除"
                @click="openDelete(skill)"
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
    <SkillFormDrawer
      v-if="showDrawer"
      :skill="editingSkill"
      :mcp-servers="mcpData?.items ?? []"
      :submitting="saveMutation.isPending.value"
      :server-error="serverError"
      @close="showDrawer = false"
      @submit="saveMutation.mutate($event)"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDeleteModal
      v-if="deletingSkill"
      title="删除 Skill"
      :message="`确定删除「${deletingSkill.name}」吗？它与 Agent 的关联会一并解除。`"
      :deleting="deleteMutation.isPending.value"
      :error="deleteMutation.isError.value"
      @cancel="deletingSkill = null"
      @confirm="deleteMutation.mutate(deletingSkill.id)"
    />
  </div>
</template>
