<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Agent, AgentPayload, AgentProvider, BuiltinToolName } from '../../../types/agent'
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

// 内置工具展示映射（后端无列表接口，前端硬编码——设计文档 §2）
const BUILTIN_TOOLS: Array<{ name: BuiltinToolName; label: string; desc: string }> = [
  { name: 'web_search', label: '联网搜索', desc: '让 Agent 可以搜索互联网获取实时信息' },
  { name: 'calculator', label: '计算器', desc: '精确数学求值，弥补大模型算数弱项' },
]

// 模型 placeholder 随 provider 联动（自由文本输入，不硬编码模型名单——设计文档 §6）
const MODEL_PLACEHOLDERS: Record<AgentProvider, string> = {
  anthropic: '如 claude-sonnet-5',
  openai: '如 gpt-5',
  deepseek: '暂未支持',
}

const form = reactive({
  name: '',
  description: '',
  provider: 'anthropic' as AgentProvider,
  model: '',
  apiKey: '',
  systemPrompt: '',
  maxTokens: 4096,
  maxIterations: 10,
  enabledTools: [] as string[],
})

const showAdvanced = ref(false)
const showApiKey = ref(false)
const localError = ref<string | null>(null)

// 编辑模式回填（apiKey 不回填，留空表示不修改——后端契约）
watch(
  () => props.agent,
  (agent) => {
    if (!agent) return
    form.name = agent.name
    form.description = agent.description ?? ''
    form.provider = agent.provider
    form.model = agent.model
    form.apiKey = ''
    form.systemPrompt = agent.systemPrompt ?? ''
    form.maxTokens = agent.maxTokens
    form.maxIterations = agent.maxIterations
    form.enabledTools = [...agent.enabledTools]
  },
  { immediate: true },
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
  if (!form.model.trim()) {
    localError.value = '请填写模型名称'
    return
  }
  if (!isEdit.value && !form.apiKey.trim()) {
    localError.value = '请填写 API Key'
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

  const payload: AgentPayload = {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    provider: form.provider,
    model: form.model.trim(),
    systemPrompt: form.systemPrompt.trim() || undefined,
    maxTokens: form.maxTokens,
    maxIterations: form.maxIterations,
    enabledTools: form.enabledTools,
  }
  // 编辑时 apiKey 留空 = 保持原值，不传该字段
  if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim()

  emit('submit', payload)
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

      <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <div>
          <label class="od-label">供应商 *</label>
          <select
            v-model="form.provider"
            class="od-input"
          >
            <option value="anthropic">
              Anthropic
            </option>
            <option value="openai">
              OpenAI
            </option>
            <option
              value="deepseek"
              disabled
            >
              DeepSeek（暂未支持）
            </option>
          </select>
        </div>
        <div>
          <label class="od-label">模型 *</label>
          <input
            v-model="form.model"
            class="od-input"
            autocomplete="off"
            :placeholder="MODEL_PLACEHOLDERS[form.provider]"
          >
        </div>
      </div>

      <div>
        <label class="od-label">
          API Key {{ isEdit ? '（留空则不修改）' : '*' }}
        </label>
        <div class="pwd-wrap">
          <input
            v-model="form.apiKey"
            :type="showApiKey ? 'text' : 'password'"
            class="od-input"
            autocomplete="new-password"
            :placeholder="isEdit ? `当前：${agent?.apiKeyMasked}` : 'sk-...'"
          >
          <button
            type="button"
            class="pwd-toggle"
            :aria-label="showApiKey ? '隐藏 API Key' : '显示 API Key'"
            @click="showApiKey = !showApiKey"
          >
            <AppIcon
              :name="showApiKey ? 'eye-off' : 'eye'"
              :size="16"
            />
          </button>
        </div>
        <p class="text-muted text-xs mt-1.5">
          仅保存在你自己的账户下，请求时通过 Authorization 头发送
        </p>
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
