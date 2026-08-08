<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { AiChannelView, ChannelModel, ChannelPayload, ModelCapability } from '../../../types/ai-generation'
import { ApiFormat } from '../../../types/ai-generation'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  /** 传入则为编辑模式，否则为创建 */
  channel?: AiChannelView | null
  submitting?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: ChannelPayload]
}>()

const isEdit = computed(() => !!props.channel)

const API_FORMAT_OPTIONS: Array<{ value: (typeof ApiFormat)[keyof typeof ApiFormat]; label: string; hint: string }> = [
  { value: ApiFormat.OpenAI, label: 'OpenAI 兼容', hint: 'OpenAI 官方及兼容网关（对话 /v1/chat、生图 /v1/images、视频 /v1/videos、音频 /v1/audio）' },
  { value: ApiFormat.Anthropic, label: 'Anthropic', hint: 'Claude 对话模型（仅支持「对话」用途）' },
  { value: ApiFormat.Ark, label: '火山方舟 Ark', hint: '豆包 Seedream 生图 / Seedance 视频（/api/v3）' },
  { value: ApiFormat.Gemini, label: 'Gemini', hint: 'Google Gemini 生图（暂不支持视频/音频/对话）' },
]

const CAPABILITY_OPTIONS: Array<{ value: ModelCapability; label: string }> = [
  { value: 'chat', label: '对话' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
]

const BASE_URL_PLACEHOLDERS: Record<string, string> = {
  openai: '如 https://api.openai.com',
  anthropic: '如 https://api.anthropic.com',
  ark: '如 https://ark.cn-beijing.volces.com/api/v3',
  gemini: '如 https://generativelanguage.googleapis.com',
}

const form = reactive({
  name: '',
  apiFormat: ApiFormat.OpenAI as (typeof ApiFormat)[keyof typeof ApiFormat],
  baseUrl: '',
  apiKey: '',
  isActive: true,
  models: [] as ChannelModel[],
})

const showApiKey = ref(false)
const localError = ref<string | null>(null)

watch(
  () => props.channel,
  (channel) => {
    if (!channel) return
    form.name = channel.name
    form.apiFormat = channel.apiFormat
    form.baseUrl = channel.baseUrl
    form.apiKey = ''
    form.isActive = channel.isActive
    form.models = channel.models.map((m) => ({ name: m.name, capability: m.capability }))
  },
  { immediate: true },
)

const addModel = () => {
  form.models.push({ name: '', capability: 'image' })
}

const removeModel = (index: number) => {
  form.models.splice(index, 1)
}

const handleSubmit = () => {
  localError.value = null
  if (!form.name.trim()) {
    localError.value = '请填写渠道名称'
    return
  }
  if (!form.baseUrl.trim()) {
    localError.value = '请填写接口地址'
    return
  }
  if (!isEdit.value && !form.apiKey.trim()) {
    localError.value = '请填写 API Key'
    return
  }
  const models = form.models
    .map((m) => ({ name: m.name.trim(), capability: m.capability }))
    .filter((m) => m.name)
  if (!models.length) {
    localError.value = '至少配置一个模型'
    return
  }
  // 与后端 CHAT_CAPABLE_FORMATS 一致：chat 仅支持 openai / anthropic
  if (models.some((m) => m.capability === 'chat') && !['openai', 'anthropic'].includes(form.apiFormat)) {
    localError.value = '当前 API 格式不支持「对话」模型（仅 OpenAI 兼容 / Anthropic 渠道支持）'
    return
  }

  const payload: ChannelPayload = {
    name: form.name.trim(),
    apiFormat: form.apiFormat,
    baseUrl: form.baseUrl.trim(),
    models,
    isActive: form.isActive,
  }
  // 编辑时 apiKey 留空 = 保持原值，不传该字段
  if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim()
  emit('submit', payload)
}
</script>

<template>
  <div
    class="od-drawer-overlay"
    @click.self="emit('close')"
  />

  <aside class="od-drawer">
    <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
      <h2 class="font-display font-bold text-[17px] text-fg">
        {{ isEdit ? '编辑渠道' : '新建渠道' }}
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

    <form
      id="channel-form"
      class="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label class="od-label">名称 *</label>
        <input
          v-model="form.name"
          class="od-input"
          autocomplete="off"
          placeholder="如：OpenAI 官方"
        >
      </div>

      <div>
        <label class="od-label">API 格式 *</label>
        <select
          v-model="form.apiFormat"
          class="od-input"
        >
          <option
            v-for="opt in API_FORMAT_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <p class="text-muted text-xs mt-1.5">
          {{ API_FORMAT_OPTIONS.find((o) => o.value === form.apiFormat)?.hint }}
        </p>
      </div>

      <div>
        <label class="od-label">接口地址 *</label>
        <input
          v-model="form.baseUrl"
          class="od-input"
          autocomplete="off"
          :placeholder="BASE_URL_PLACEHOLDERS[form.apiFormat]"
        >
        <p class="text-muted text-xs mt-1.5">
          OpenAI 兼容地址会自动补 /v1；Ark 填到 /api/v3
        </p>
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
            :placeholder="isEdit ? `当前：${channel?.apiKeyMasked}` : 'sk-...'"
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
          加密存储在服务端，响应中只回脱敏值
        </p>
      </div>

      <!-- 模型清单 -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="od-label !mb-0">模型清单 *</label>
          <button
            type="button"
            class="od-btn od-btn-ghost !px-3 !py-1.5 text-xs"
            @click="addModel"
          >
            <AppIcon
              name="plus"
              :size="14"
            />
            添加模型
          </button>
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="(model, index) in form.models"
            :key="index"
            class="flex items-center gap-2"
          >
            <input
              v-model="model.name"
              class="od-input flex-1"
              autocomplete="off"
              placeholder="模型名，如 gpt-image-2"
            >
            <select
              v-model="model.capability"
              class="od-input !w-24 shrink-0"
            >
              <option
                v-for="opt in CAPABILITY_OPTIONS"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <button
              type="button"
              class="od-icon-btn !w-9 !h-9 shrink-0 hover:!text-danger hover:!border-danger/40"
              title="移除"
              @click="removeModel(index)"
            >
              <AppIcon
                name="trash-2"
                :size="15"
              />
            </button>
          </div>
          <p
            v-if="!form.models.length"
            class="text-muted text-xs"
          >
            还没有模型，点「添加模型」配置渠道侧可用的模型
          </p>
        </div>
      </div>

      <label class="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-fg/5 transition-colors">
        <input
          v-model="form.isActive"
          type="checkbox"
          class="accent-[var(--accent)]"
        >
        <span>
          <span class="block text-fg text-sm font-medium">启用该渠道</span>
          <span class="block text-muted text-xs mt-0.5">停用后生成时不可选用</span>
        </span>
      </label>

      <p
        v-if="localError || serverError"
        class="od-error"
      >
        {{ localError || serverError }}
      </p>
    </form>

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
        form="channel-form"
        class="od-btn od-btn-primary flex-1"
        :disabled="submitting"
      >
        {{ submitting ? '提交中...' : isEdit ? '保存' : '创建' }}
      </button>
    </div>
  </aside>
</template>
