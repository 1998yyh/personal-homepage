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
      <label class="block text-white/60 text-sm mb-2">输入</label>
      <textarea
        v-model="input"
        placeholder="输入内容..."
        class="w-full h-32 px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10 resize-none focus:border-white/20 focus:outline-none"
      />
    </div>

    <div class="flex gap-2">
      <button
        v-for="btn in buttons"
        :key="btn.label"
        class="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
        @click="btn.onClick"
      >
        {{ btn.label }}
      </button>
      <button
        :disabled="!output"
        class="px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 disabled:opacity-50"
        @click="copyOutput"
      >
        复制结果
      </button>
      <button
        class="px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10"
        @click="input = ''"
      >
        清空
      </button>
    </div>

    <div
      v-if="error"
      class="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
    >
      {{ error }}
    </div>

    <div>
      <label class="block text-white/60 text-sm mb-2">输出</label>
      <textarea
        :value="output"
        readonly
        :class="`w-full ${outputHeight} px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10 resize-none`"
      />
    </div>
  </div>
</template>
