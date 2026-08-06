<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Skill, SkillBuiltinToolName, SkillPayload } from '../../../types/skill'
import type { McpServer } from '../../../types/mcp-server'
import { useAuthStore } from '../../../stores/auth'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  /** 传入则为编辑模式，否则为创建 */
  skill?: Skill | null
  /** 可关联的 MCP Server 列表（父组件传入，stdio 类型非管理员不可选） */
  mcpServers?: McpServer[]
  submitting?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: SkillPayload]
}>()

const auth = useAuthStore()
const isEdit = computed(() => !!props.skill)
const isAdmin = computed(() => auth.user?.role === 'admin')

// 内置工具展示映射（后端 tool-names.ts 静态注册表，无列表接口，前端硬编码）
const BUILTIN_TOOLS: Array<{ name: SkillBuiltinToolName; label: string; desc: string }> = [
  { name: 'web_search', label: '联网搜索', desc: '搜索互联网获取实时信息' },
  { name: 'calculator', label: '计算器', desc: '精确数学求值' },
  { name: 'create_scheduled_task', label: '创建定时任务', desc: '为所属 Agent 创建定时任务' },
  { name: 'write_daily_report', label: '写日报', desc: '把内容写入日报系统' },
  { name: 'list_scheduled_tasks', label: '查看定时任务', desc: '列出所属 Agent 的定时任务' },
  { name: 'delete_scheduled_task', label: '删除定时任务', desc: '删除所属 Agent 的定时任务' },
]

// stdio 类型仅管理员可关联（后端 validateForAssociation 的 403 契约的前端兜底）
const isMcpSelectable = (server: McpServer) => isAdmin.value || server.type !== 'stdio'

const form = reactive({
  name: '',
  description: '',
  systemPrompt: '',
  enabledTools: [] as string[],
  mcpServerIds: [] as string[],
})

const localError = ref<string | null>(null)

// 编辑模式回填
watch(
  () => props.skill,
  (skill) => {
    if (!skill) return
    form.name = skill.name
    form.description = skill.description
    form.systemPrompt = skill.systemPrompt
    form.enabledTools = [...(skill.enabledTools ?? [])]
    form.mcpServerIds = [...skill.mcpServerIds]
  },
  { immediate: true },
)

const toggleIn = (arr: string[], value: string) => {
  const idx = arr.indexOf(value)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(value)
}

// Esc 关闭抽屉
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const NAME_PATTERN = /^[a-z][a-z0-9_]*$/

const handleSubmit = () => {
  localError.value = null
  if (!form.name.trim()) {
    localError.value = '请填写工具名'
    return
  }
  if (!NAME_PATTERN.test(form.name.trim())) {
    localError.value = '工具名只能包含小写字母、数字、下划线，且必须以字母开头'
    return
  }
  if (!form.description.trim()) {
    localError.value = '请填写工具描述'
    return
  }
  if (form.description.trim().length > 500) {
    localError.value = '工具描述不能超过 500 字'
    return
  }
  if (!form.systemPrompt.trim()) {
    localError.value = '请填写执行指令（系统提示词）'
    return
  }

  const payload: SkillPayload = {
    name: form.name.trim(),
    description: form.description.trim(),
    systemPrompt: form.systemPrompt.trim(),
    enabledTools: form.enabledTools,
    mcpServerIds: form.mcpServerIds,
  }

  emit('submit', payload)
}
</script>

<template>
  <!-- 遮罩 -->
  <div
    class="od-drawer-overlay"
    @click.self="emit('close')"
  />

  <!-- 右侧抽屉 -->
  <aside class="od-drawer">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
      <h2 class="font-display font-bold text-[17px] text-fg">
        {{ isEdit ? '编辑 Skill' : '新建 Skill' }}
      </h2>
      <button
        class="od-icon-btn !w-9 !h-9"
        aria-label="关闭"
        @click="emit('close')"
      >
        <AppIcon
          name="x"
          :size="16"
        />
      </button>
    </div>

    <!-- 表单主体（可滚动） -->
    <form
      id="skill-form"
      class="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label class="od-label">工具名 *</label>
        <input
          v-model="form.name"
          class="od-input font-mono"
          autocomplete="off"
          placeholder="如：generate_ai_report"
        >
        <p class="text-muted text-xs mt-1.5">
          LLM 调用时的 tool name，小写字母/数字/下划线、字母开头，全局唯一
        </p>
      </div>

      <div>
        <label class="od-label">工具描述 *</label>
        <textarea
          v-model="form.description"
          class="od-input resize-none"
          rows="2"
          placeholder="写清能做什么、何时适合用——LLM 依此决定何时调用，直接影响调用质量"
        />
      </div>

      <div>
        <label class="od-label">执行指令（系统提示词）*</label>
        <textarea
          v-model="form.systemPrompt"
          class="od-input resize-y min-h-[120px]"
          rows="5"
          placeholder="如：你是一个 AI 日报撰写助手，收到主题后搜索最新资讯并整理为结构化日报……"
        />
      </div>

      <!-- 内置工具多选 -->
      <div>
        <label class="od-label">内置工具</label>
        <div class="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
          <label
            v-for="tool in BUILTIN_TOOLS"
            :key="tool.name"
            class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
            :class="form.enabledTools.includes(tool.name)
              ? 'border-accent bg-accent-soft'
              : 'border-border hover:bg-fg/5'"
          >
            <input
              type="checkbox"
              class="mt-0.5 accent-[var(--accent)]"
              :checked="form.enabledTools.includes(tool.name)"
              @change="toggleIn(form.enabledTools, tool.name)"
            >
            <span>
              <span class="block text-fg text-sm font-medium">{{ tool.label }}</span>
              <span class="block text-muted text-xs mt-0.5">{{ tool.desc }}</span>
            </span>
          </label>
        </div>
      </div>

      <!-- 关联 MCP Server 多选 -->
      <div>
        <label class="od-label">关联 MCP Server</label>
        <p
          v-if="!mcpServers?.length"
          class="text-muted text-xs"
        >
          暂无可用 MCP Server，可先到 <router-link
            to="/mcp-servers"
            class="text-accent-strong hover:underline"
          >
            MCP 工具库
          </router-link> 创建
        </p>
        <div
          v-else
          class="grid grid-cols-2 gap-2 max-sm:grid-cols-1"
        >
          <label
            v-for="server in mcpServers"
            :key="server.id"
            class="flex items-start gap-3 p-3 rounded-xl border transition-colors"
            :class="[
              form.mcpServerIds.includes(server.id)
                ? 'border-accent bg-accent-soft'
                : 'border-border',
              isMcpSelectable(server) ? 'cursor-pointer hover:bg-fg/5' : 'opacity-50 cursor-not-allowed',
            ]"
          >
            <input
              type="checkbox"
              class="mt-0.5 accent-[var(--accent)]"
              :checked="form.mcpServerIds.includes(server.id)"
              :disabled="!isMcpSelectable(server)"
              @change="toggleIn(form.mcpServerIds, server.id)"
            >
            <span>
              <span class="block text-fg text-sm font-medium">{{ server.name }}</span>
              <span class="block text-muted text-xs mt-0.5">
                {{ server.type }}{{ isMcpSelectable(server) ? '' : '（仅管理员可关联）' }}
              </span>
            </span>
          </label>
        </div>
      </div>

      <!-- 错误展示 -->
      <p
        v-if="localError || serverError"
        class="od-error"
      >
        {{ localError || serverError }}
      </p>
    </form>

    <!-- 底部操作 -->
    <div class="flex gap-3 px-6 py-4 border-t border-border shrink-0">
      <button
        type="button"
        class="od-btn od-btn-ghost flex-1"
        @click="emit('close')"
      >
        取消
      </button>
      <button
        type="submit"
        form="skill-form"
        class="od-btn od-btn-primary flex-1"
        :disabled="submitting"
      >
        {{ submitting ? '提交中...' : isEdit ? '保存' : '创建' }}
      </button>
    </div>
  </aside>
</template>
