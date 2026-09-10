<script setup lang="ts">
import { computed } from 'vue'
import type { ChannelPresetCatalog, VideoModelConfig } from '../../../types/ai-generation'
import { videoRequirements } from '../../../lib/video-model-config'
const props = defineProps<{ templates: ChannelPresetCatalog['templates'] }>()
const model = defineModel<VideoModelConfig | undefined>()
const fields = [
  ['images', '参考图片'], ['firstFrame', '首帧'], ['lastFrame', '尾帧'],
  ['audio', '音频'], ['seconds', '时长'], ['resolution', '清晰度'], ['aspectRatio', '比例'],
] as const
const numericFields = [['minImages', '最少图片数'], ['maxImages', '最多图片数'], ['maxSeconds', '最长秒数'], ['fixedSeconds', '固定秒数']] as const
const selectedTemplate = computed(() => props.templates.find((t) => t.config.template === model.value?.template)?.id ?? '')
function selectTemplate(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  model.value = id ? JSON.parse(JSON.stringify(props.templates.find((t) => t.id === id)!.config)) : undefined
}
function update(patch: Partial<VideoModelConfig>) {
  if (model.value) model.value = { ...model.value, ...patch }
}
function setField(key: typeof fields[number][0], event: Event) {
  const next = { ...model.value?.fields }
  const value = (event.target as HTMLInputElement).value.trim()
  if (value) next[key] = value
  else delete next[key]
  update({ fields: next })
}
function setNumber(key: typeof numericFields[number][0], event: Event) {
  const value = (event.target as HTMLInputElement).value
  update({ [key]: value === '' ? undefined : Number(value) })
}
</script>

<template>
  <div class="space-y-2 border-t border-border pt-2">
    <label class="od-label">视频参数模板</label>
    <select
      :value="selectedTemplate"
      class="od-input"
      aria-label="视频参数模板"
      @change="selectTemplate"
    >
      <option value="">
        使用渠道默认规则
      </option>
      <option
        v-for="item in templates"
        :key="item.id"
        :value="item.id"
      >
        {{ item.name }}
      </option>
    </select>
    <p
      v-if="model"
      class="text-xs text-muted"
    >
      {{ videoRequirements(model) }}
    </p>
    <p
      v-if="!templates.length"
      class="text-xs text-muted"
    >
      模板暂不可用，已有配置将保留。
    </p>
    <details
      v-if="model"
      class="text-xs"
    >
      <summary class="cursor-pointer text-muted">
        高级参数（按渠道文档调整）
      </summary>
      <div class="mt-3 grid grid-cols-2 gap-3">
        <label class="col-span-2">请求格式
          <select
            :value="model.requestFormat"
            class="od-input mt-1"
            @change="update({ requestFormat: ($event.target as HTMLSelectElement).value as VideoModelConfig['requestFormat'] })"
          >
            <option value="json">JSON</option><option value="multipart">表单上传</option>
          </select>
        </label>
        <label
          v-for="[key, label] in fields"
          :key="key"
        >{{ label }}字段
          <input
            :value="model.fields?.[key]"
            class="od-input mt-1"
            placeholder="默认"
            @input="setField(key, $event)"
          >
        </label>
        <label
          v-for="[key, label] in numericFields"
          :key="key"
        >{{ label }}
          <input
            :value="model[key]"
            type="number"
            :min="key.endsWith('Images') ? 0 : 1"
            step="1"
            class="od-input mt-1"
            placeholder="默认"
            @input="setNumber(key, $event)"
          >
        </label>
        <label class="col-span-2">支持的清晰度（逗号分隔）
          <input
            :value="model.resolutions?.join(', ')"
            class="od-input mt-1"
            placeholder="480P, 720P"
            @change="update({ resolutions: ($event.target as HTMLInputElement).value.split(/[,，]/).map(s => s.trim()).filter(Boolean) })"
          >
        </label>
        <label class="col-span-2">固定清晰度
          <input
            :value="model.fixedResolution"
            class="od-input mt-1"
            placeholder="不限制"
            @input="update({ fixedResolution: ($event.target as HTMLInputElement).value.trim() || undefined })"
          >
        </label>
      </div>
    </details>
  </div>
</template>
