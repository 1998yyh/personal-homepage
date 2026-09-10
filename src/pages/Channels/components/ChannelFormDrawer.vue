<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { channelsApi } from '../../../lib/channels-api'
import VideoModelConfigEditor from './VideoModelConfigEditor.vue'
import type { AiChannelView, ChannelModel, ChannelPayload, ModelCapability } from '../../../types/ai-generation'
import { ApiFormat } from '../../../types/ai-generation'
import AppIcon from '../../../components/AppIcon.vue'
import OdSelect from '../../../components/ui/OdSelect.vue'

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
  { value: 'video', label: '视频' },
  { value: 'image', label: '图片' },
  { value: 'chat', label: '对话' },
  { value: 'audio', label: '音频' },
]

/** 表单按模型名合并用途；提交时再拆成后端的「一条记录一个用途」 */
interface FormModel {
  name: string
  capabilities: ModelCapability[]
  originals: Partial<Record<ModelCapability, ChannelModel>>
  videoConfig?: ChannelModel['videoConfig']
}

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
  models: [] as FormModel[],
})

const selectedPreset = ref('')
const showAdvanced = ref(false)
const { data: catalog, isPending: presetsPending, isError: presetsError } = useQuery({
  queryKey: ['ai-channel-presets'], queryFn: channelsApi.presets,
})
const presetOptions = computed(() => [
  ...(catalog.value?.presets ?? []).map((p) => ({ value: p.id, label: p.name })),
  { value: 'custom', label: '自定义渠道' },
])
const advancedVisible = computed(() => isEdit.value || selectedPreset.value === 'custom' || showAdvanced.value)
function applyPreset(id: string | undefined) {
  if (!id) return
  selectedPreset.value = id
  if (id === 'custom') return
  const preset = catalog.value?.presets.find((p) => p.id === id)
  if (!preset) return
  form.name = preset.name
  form.baseUrl = preset.baseUrl
  form.apiFormat = preset.apiFormat
  form.models = mergeModels(preset.models)
}
// 只在首次加载时填预设，后台刷新和模式切换均不覆盖已输入的密钥。
watch(catalog, (value) => {
  if (!isEdit.value && !selectedPreset.value && value) applyPreset(value.presets[0]?.id ?? 'custom')
}, { immediate: true })
watch(presetsError, (failed) => {
  if (failed && !selectedPreset.value) selectedPreset.value = 'custom'
}, { immediate: true })
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
    form.models = mergeModels(channel.models)
  },
  { immediate: true },
)

/** 同名模型的多条单用途记录合并成一行多选 */
function mergeModels(models: ChannelModel[]): FormModel[] {
  const rows: FormModel[] = []
  const indexByName = new Map<string, number>()
  for (const m of models) {
    const i = indexByName.get(m.name)
    if (i == null) {
      indexByName.set(m.name, rows.length)
      rows.push({ name: m.name, capabilities: [m.capability], originals: { [m.capability]: JSON.parse(JSON.stringify(m)) }, videoConfig: m.videoConfig ? JSON.parse(JSON.stringify(m.videoConfig)) : undefined })
    } else if (!rows[i].capabilities.includes(m.capability)) {
      rows[i].capabilities.push(m.capability)
      rows[i].originals[m.capability] = JSON.parse(JSON.stringify(m))
      if (m.videoConfig) rows[i].videoConfig = JSON.parse(JSON.stringify(m.videoConfig))
    }
  }
  return rows
}

const addModel = () => {
  form.models.push({ name: '', capabilities: ['image'], originals: {} })
}

const toggleCapability = (model: FormModel, cap: ModelCapability) => {
  const i = model.capabilities.indexOf(cap)
  if (i >= 0) model.capabilities.splice(i, 1)
  else model.capabilities.push(cap)
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
  const models: ChannelModel[] = []
  const seen = new Map<string, Set<ModelCapability>>()
  for (const row of form.models) {
    const name = row.name.trim()
    if (!name) continue
    if (!row.capabilities.length) {
      localError.value = `「${name}」请至少选择一种用途`
      return
    }
    let caps = seen.get(name)
    if (!caps) {
      caps = new Set()
      seen.set(name, caps)
    }
    for (const cap of row.capabilities) {
      if (caps.has(cap)) {
        localError.value = `「${name}」的${CAPABILITY_OPTIONS.find((o) => o.value === cap)?.label}用途重复，请合并或移除重复行`
        return
      }
      caps.add(cap)
    }
  }
  for (const [name, caps] of seen) {
    for (const opt of CAPABILITY_OPTIONS) {
      if (caps.has(opt.value)) {
        const row = form.models.find((r) => r.name.trim() === name && r.capabilities.includes(opt.value))!
        const model: ChannelModel = { ...row.originals[opt.value], name, capability: opt.value }
        if (opt.value === 'video') {
          if (row.videoConfig) model.videoConfig = row.videoConfig
          else delete model.videoConfig
        }
        models.push(model)
      }
    }
  }
  if (!models.length) {
    localError.value = '至少配置一个模型'
    return
  }
  // 与后端 CHAT_CAPABLE_FORMATS 一致：chat 仅支持 openai / anthropic
  if (models.some((m) => m.capability === 'chat') && !['openai', 'anthropic'].includes(form.apiFormat)) {
    localError.value = '当前 API 格式不支持「对话」模型（仅 OpenAI 兼容 / Anthropic 渠道支持）'
    return
  }

  if (form.apiFormat !== 'openai' && models.some((m) => m.videoConfig)) {
    localError.value = '视频参数模板仅适用于 OpenAI 兼容格式，请先恢复渠道默认规则，或切回 OpenAI 兼容格式'
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
      <div
        v-if="!isEdit"
        class="space-y-2"
      >
        <label class="od-label">渠道方案</label>
        <OdSelect
          :model-value="selectedPreset"
          :options="presetOptions"
          placeholder="加载预设…"
          @update:model-value="applyPreset"
        />
        <p
          v-if="presetsPending"
          class="text-xs text-muted"
        >
          正在加载预设，也可以选择自定义渠道。
        </p>
        <p
          v-if="presetsError"
          class="od-error"
        >
          预设加载失败，请稍后重试，或使用自定义渠道。
        </p>
        <div
          v-if="selectedPreset && selectedPreset !== 'custom'"
          class="rounded-xl border border-border p-3 text-xs text-muted space-y-2"
        >
          <p>填入此渠道的 API Key 即可使用以下模型。</p>
          <p class="break-all">
            {{ form.baseUrl }}
          </p>
          <p class="break-words">
            {{ form.models.map(m => m.name).join('、') }}
          </p>
          <button
            type="button"
            class="text-accent-strong"
            @click="showAdvanced = !showAdvanced"
          >
            {{ showAdvanced ? '收起配置' : '调整地址和模型' }}
          </button>
        </div>
      </div>
      <div v-if="advancedVisible">
        <label class="od-label">名称 *</label>
        <input
          v-model="form.name"
          class="od-input"
          autocomplete="off"
          placeholder="如：OpenAI 官方"
        >
      </div>

      <div v-if="advancedVisible">
        <label class="od-label">API 格式 *</label>
        <OdSelect
          v-model="form.apiFormat"
          :options="API_FORMAT_OPTIONS"
        />
        <p class="text-muted text-xs mt-1.5">
          {{ API_FORMAT_OPTIONS.find((o) => o.value === form.apiFormat)?.hint }}
        </p>
      </div>

      <div v-if="advancedVisible">
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
      <div v-if="advancedVisible">
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
        <p class="text-muted text-xs mb-2">
          同一模型可勾选多种用途，例如既生图又生视频
        </p>
        <div class="flex flex-col gap-2">
          <div
            v-for="(model, index) in form.models"
            :key="index"
            class="flex flex-col gap-2 p-3 rounded-xl border border-border"
          >
            <div class="flex items-center gap-2">
              <input
                v-model="model.name"
                class="od-input flex-1"
                autocomplete="off"
                placeholder="模型名，如 MiniMax-H3"
              >
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
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="opt in CAPABILITY_OPTIONS"
                :key="opt.value"
                type="button"
                class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                :class="model.capabilities.includes(opt.value)
                  ? 'bg-accent-soft text-accent-strong'
                  : 'bg-fg/5 text-muted hover:bg-fg/10'"
                :aria-pressed="model.capabilities.includes(opt.value)"
                @click="toggleCapability(model, opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
            <div
              v-if="model.capabilities.includes('video') && model.videoConfig && form.apiFormat !== 'openai'"
              class="text-xs space-y-2"
            >
              <p class="od-error">
                此视频模板仅适用于 OpenAI 兼容格式。请选择该格式，或移除模板使用当前渠道的默认规则。
              </p>
              <button
                type="button"
                class="od-btn od-btn-ghost"
                @click="model.videoConfig = undefined"
              >
                恢复渠道默认规则
              </button>
            </div>
            <VideoModelConfigEditor
              v-if="model.capabilities.includes('video') && form.apiFormat === 'openai'"
              v-model="model.videoConfig"
              :templates="catalog?.templates ?? []"
            />
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
