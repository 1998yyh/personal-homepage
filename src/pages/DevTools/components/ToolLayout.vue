<script setup lang="ts">
interface Props {
  output: string
  error?: string
  buttons: { label: string; onClick: () => void }[]
  outputHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  error: '',
  outputHeight: 'h-48',
})

const input = defineModel<string>('input', { required: true })

const copyOutput = () => {
  navigator.clipboard.writeText(props.output)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <label class="od-label">输入</label>
      <textarea
        v-model="input"
        placeholder="输入内容..."
        class="od-input h-32 font-mono !text-[13px] resize-none"
      />
    </div>

    <div class="flex gap-2 flex-wrap">
      <button
        v-for="btn in buttons"
        :key="btn.label"
        class="od-btn od-btn-soft"
        @click="btn.onClick"
      >
        {{ btn.label }}
      </button>
      <button
        :disabled="!output"
        class="od-btn od-btn-primary"
        @click="copyOutput"
      >
        复制结果
      </button>
      <button
        class="od-btn od-btn-ghost"
        @click="input = ''"
      >
        清空
      </button>
    </div>

    <div
      v-if="error"
      class="od-error"
    >
      {{ error }}
    </div>

    <div>
      <label class="od-label">输出</label>
      <textarea
        :value="output"
        readonly
        :class="`od-input ${outputHeight} font-mono !text-[13px] resize-none`"
      />
    </div>
  </div>
</template>
