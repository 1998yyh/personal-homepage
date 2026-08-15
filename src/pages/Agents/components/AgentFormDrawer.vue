<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { Agent, AgentPayload, BuiltinToolName } from '../../../types/agent'
import { BUILTIN_TOOL_LABELS } from '../../../types/agent'
import { channelsApi } from '../../../lib/channels-api'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  /** 传入则为编辑模式，否则为创建 */
  agent?: Agent | null
  submitting?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: AgentPayload]
}>()

const isEdit = computed(() => !!props.agent)

// 内置工具展示映射（后端无列表接口，前端硬编码——设计文档 §2；中文名来自共享常量 BUILTIN_TOOL_LABELS）
const BUILTIN_TOOLS: Array<{ name: BuiltinToolName; label: string; desc: string }> = ([
  { name: 'web_search', desc: '让 Agent 可以搜索互联网获取实时信息' },
  { name: 'calculator', desc: '精确数学求值，弥补大模型算数弱项' },
] as const).map((t) => ({ ...t, label: BUILTIN_TOOL_LABELS[t.name] }))

const form = reactive({
  name: '',
  description: '',
  channelId: '',
  modelName: '',
  systemPrompt: '',
  maxTokens: 4096,
  maxIterations: 10,
  enabledTools: [] as string[],
})

const showAdvanced = ref(false)
const localError = ref<string | null>(null)

// 渠道列表（与画布生成节点同一 queryKey，共享缓存）
const { data: channels } = useQuery({
  queryKey: ['ai-channels'],
  queryFn: () => channelsApi.list(),
})

/** 可选渠道：启用中且含对话模型 */
const chatChannels = computed(() =>
  (channels.value ?? []).filter(
    (c) => c.isActive && c.models.some((m) => m.capability === 'chat'),
  ),
)

/** 当前选中渠道下的对话模型 */
const chatModels = computed(
  () =>
    chatChannels.value
      .find((c) => c.id === form.channelId)
      ?.models.filter((m) => m.capability === 'chat') ?? [],
)

/** 编辑时原渠道已停用/删除的兜底展示 */
const missingChannel = computed(
  () =>
    isEdit.value &&
    form.channelId &&
    !chatChannels.value.some((c) => c.id === form.channelId),
)

// 编辑模式回填（连接信息来自渠道引用，不回填任何凭据）
watch(
  () => props.agent,
  (agent) => {
    if (!agent) return
    form.name = agent.name
    form.description = agent.description ?? ''
    form.channelId = agent.channelId
    form.modelName = agent.modelName
    form.systemPrompt = agent.systemPrompt ?? ''
    form.maxTokens = agent.maxTokens
    form.maxIterations = agent.maxIterations
    form.enabledTools = [...agent.enabledTools]
  },
  { immediate: true },
)

// 手动切换渠道时清空模型（旧选择多半不属于新渠道；回填时 prev 为空串不触发）
watch(
  () => form.channelId,
  (next, prev) => {
    if (prev && next !== prev) form.modelName = ''
  },
)

const toggleTool = (name: string) => {
  const idx = form.enabledTools.indexOf(name)
  if (idx >= 0) form.enabledTools.splice(idx, 1)
  else form.enabledTools.push(name)
}

// Esc 关闭抽屉
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const handleSubmit = () => {
  localError.value = null
  if (!form.name.trim()) {
    localError.value = '请填写 Agent 名称'
    return
  }
  if (!form.channelId) {
    localError.value = '请选择渠道'
    return
  }
  if (!form.modelName) {
    localError.value = '请选择对话模型'
    return
  }
  // v-model.number 在输入被清空/非法时会留下空字符串，这里兜底校验
  if (!Number.isInteger(form.maxTokens) || form.maxTokens < 1) {
    localError.value = '最大 Token 数需为不小于 1 的整数'
    return
  }
  if (!Number.isInteger(form.maxIterations) || form.maxIterations < 1) {
    localError.value = '最大工具调用轮次需为不小于 1 的整数'
    return
  }

  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    channelId: form.channelId,
    modelName: form.modelName,
    systemPrompt: form.systemPrompt.trim() || undefined,
    maxTokens: form.maxTokens,
    maxIterations: form.maxIterations,
    enabledTools: form.enabledTools,
  })
}
</script>

<template>
  <!-- 遮罩 -->
  <div
    class="od-drawer-overlay"
    @click.self="emit('close')"
  />

  <!-- 右侧抽屉（对齐 design/agent-admin.html） -->
  <aside class="od-drawer">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
      <h2 class="font-display font-bold text-[17px] text-fg">
        {{ isEdit ? '编辑 Agent' : '新建 Agent' }}
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
      id="agent-form"
      class="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label class="od-label">名称 *</label>
        <input
          v-model="form.name"
          class="od-input"
          autocomplete="off"
          placeholder="如：翻译助手"
        >
      </div>

      <div>
        <label class="od-label">描述</label>
        <textarea
          v-model="form.description"
          class="od-input resize-none"
          rows="2"
          placeholder="这个 Agent 是干什么的"
        />
      </div>

      <template v-if="chatChannels.length">
        <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div>
            <label class="od-label">渠道 *</label>
            <select
              v-model="form.channelId"
              class="od-input"
            >
              <option
                value=""
                disabled
              >
                选择渠道
              </option>
              <option
                v-for="c in chatChannels"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
              <!-- 编辑时原渠道已停用/删除的兜底项 -->
              <option
                v-if="missingChannel"
                :value="form.channelId"
              >
                {{ agent?.channelName ?? '原渠道' }}（已停用或删除）
              </option>
            </select>
          </div>
          <div>
            <label class="od-label">对话模型 *</label>
            <select
              v-model="form.modelName"
              class="od-input"
              :disabled="!form.channelId"
            >
              <option
                value=""
                disabled
              >
                {{ form.channelId ? '选择模型' : '先选择渠道' }}
              </option>
              <option
                v-for="m in chatModels"
                :key="m.name"
                :value="m.name"
              >
                {{ m.name }}
              </option>
              <!-- 编辑时原模型已被移出渠道的兜底项 -->
              <option
                v-if="isEdit && form.modelName && !chatModels.some((m) => m.name === form.modelName)"
                :value="form.modelName"
              >
                {{ form.modelName }}（已不在渠道中）
              </option>
            </select>
          </div>
        </div>
        <p class="text-muted text-xs -mt-2">
          渠道的接口地址与 API Key 在「渠道管理」中统一维护
        </p>
      </template>

      <!-- 无对话渠道的空态引导 -->
      <div
        v-else
        class="border border-dashed border-border rounded-xl px-4 py-5 text-sm text-muted flex flex-col gap-2"
      >
        <p>还没有可用的对话模型渠道（需要渠道下至少一个「对话」用途的模型）</p>
        <router-link
          to="/channels"
          class="text-accent-strong font-medium hover:underline"
        >
          前往渠道管理创建 →
        </router-link>
      </div>

      <div>
        <label class="od-label">系统提示词</label>
        <textarea
          v-model="form.systemPrompt"
          class="od-input resize-y min-h-[84px]"
          rows="3"
          placeholder="如：你是一个专业的翻译助手……"
        />
      </div>

      <!-- 高级区（默认折叠） -->
      <div class="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          class="w-full px-4 py-3 flex items-center justify-between text-fg/80 hover:bg-fg/5 transition-colors text-sm font-medium"
          @click="showAdvanced = !showAdvanced"
        >
          <span>高级配置</span>
          <AppIcon
            name="chevron-down"
            :size="16"
            class="transition-transform"
            :class="{ 'rotate-180': showAdvanced }"
          />
        </button>

        <div
          v-if="showAdvanced"
          class="px-4 pb-4 pt-4 border-t border-border flex flex-col gap-4"
        >
          <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div>
              <label class="od-label">最大 Token 数</label>
              <input
                v-model.number="form.maxTokens"
                type="number"
                min="1"
                max="200000"
                class="od-input"
              >
            </div>
            <div>
              <label class="od-label">最大工具调用轮次</label>
              <input
                v-model.number="form.maxIterations"
                type="number"
                min="1"
                max="50"
                class="od-input"
              >
            </div>
          </div>

          <div>
            <label class="od-label">内置工具</label>
            <div class="flex flex-col gap-2">
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
                  @change="toggleTool(tool.name)"
                >
                <span>
                  <span class="block text-fg text-sm font-medium">{{ tool.label }}</span>
                  <span class="block text-muted text-xs mt-0.5">{{ tool.desc }}</span>
                </span>
              </label>
            </div>
          </div>
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
        form="agent-form"
        class="od-btn od-btn-primary flex-1"
        :disabled="submitting"
      >
        {{ submitting ? '提交中...' : isEdit ? '保存' : '创建' }}
      </button>
    </div>
  </aside>
</template>
