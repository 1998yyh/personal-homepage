<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Agent, AgentPayload, AgentProvider, BuiltinToolName } from '../../../types/agent'

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
  <!-- 弹窗遮罩 -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    @click.self="emit('close')"
  >
    <div class="glass-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-display font-bold text-white">
          {{ isEdit ? '编辑 Agent' : '新建 Agent' }}
        </h2>
        <button
          class="text-white/50 hover:text-white transition-colors"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <form
        class="space-y-4"
        @submit.prevent="handleSubmit"
      >
        <!-- 简易区 -->
        <div>
          <label class="block text-white/60 text-sm mb-1.5">名称 *</label>
          <input
            v-model="form.name"
            class="input-glass"
            placeholder="如：翻译助手"
          >
        </div>

        <div>
          <label class="block text-white/60 text-sm mb-1.5">描述</label>
          <textarea
            v-model="form.description"
            class="input-glass resize-none"
            rows="2"
            placeholder="这个 Agent 是干什么的"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-white/60 text-sm mb-1.5">供应商 *</label>
            <select
              v-model="form.provider"
              class="input-glass"
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
            <label class="block text-white/60 text-sm mb-1.5">模型 *</label>
            <input
              v-model="form.model"
              class="input-glass"
              :placeholder="MODEL_PLACEHOLDERS[form.provider]"
            >
          </div>
        </div>

        <div>
          <label class="block text-white/60 text-sm mb-1.5">
            API Key {{ isEdit ? '（留空则不修改）' : '*' }}
          </label>
          <input
            v-model="form.apiKey"
            type="password"
            class="input-glass"
            :placeholder="isEdit ? `当前：${agent?.apiKeyMasked}` : 'sk-...'"
          >
        </div>

        <div>
          <label class="block text-white/60 text-sm mb-1.5">系统提示词</label>
          <textarea
            v-model="form.systemPrompt"
            class="input-glass resize-none"
            rows="3"
            placeholder="如：你是一个专业的翻译助手……"
          />
        </div>

        <!-- 高级区（默认折叠） -->
        <div class="border border-white/10 rounded-xl overflow-hidden">
          <button
            type="button"
            class="w-full px-4 py-3 flex items-center justify-between text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
            @click="showAdvanced = !showAdvanced"
          >
            <span>高级配置</span>
            <span :class="['transition-transform', showAdvanced ? 'rotate-180' : '']">▾</span>
          </button>

          <div
            v-if="showAdvanced"
            class="px-4 pb-4 space-y-4 border-t border-white/10 pt-4"
          >
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-white/60 text-sm mb-1.5">最大 Token 数</label>
                <input
                  v-model.number="form.maxTokens"
                  type="number"
                  min="1"
                  max="200000"
                  class="input-glass"
                >
              </div>
              <div>
                <label class="block text-white/60 text-sm mb-1.5">最大工具调用轮次</label>
                <input
                  v-model.number="form.maxIterations"
                  type="number"
                  min="1"
                  max="50"
                  class="input-glass"
                >
              </div>
            </div>

            <div>
              <label class="block text-white/60 text-sm mb-2">内置工具</label>
              <div class="space-y-2">
                <label
                  v-for="tool in BUILTIN_TOOLS"
                  :key="tool.name"
                  class="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors"
                >
                  <input
                    type="checkbox"
                    class="mt-0.5 accent-primary-500"
                    :checked="form.enabledTools.includes(tool.name)"
                    @change="toggleTool(tool.name)"
                  >
                  <span>
                    <span class="block text-white/90 text-sm">{{ tool.label }}</span>
                    <span class="block text-white/40 text-xs mt-0.5">{{ tool.desc }}</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 错误展示 -->
        <p
          v-if="localError || serverError"
          class="error-message"
        >
          {{ localError || serverError }}
        </p>

        <!-- 操作按钮 -->
        <div class="flex gap-3 pt-2">
          <button
            type="button"
            class="flex-1 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="submit"
            class="btn-primary flex-1 !py-3 disabled:opacity-50 disabled:pointer-events-none"
            :disabled="submitting"
          >
            {{ submitting ? '提交中...' : isEdit ? '保存' : '创建' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
