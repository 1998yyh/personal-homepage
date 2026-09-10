<script setup lang="ts">
import { ref } from 'vue'
import OdSelect from '../../../components/ui/OdSelect.vue'

const BASE_OPTIONS = [
  { value: '2', label: '二进制' },
  { value: '8', label: '八进制' },
  { value: '10', label: '十进制' },
  { value: '16', label: '十六进制' },
]

const input = ref('255')
const base = ref('10')
const results = ref<Record<string, string>>({})

const convert = () => {
  const num = parseInt(input.value, Number(base.value))
  if (isNaN(num)) {
    results.value = {}
    return
  }
  results.value = {
    二进制: num.toString(2),
    八进制: num.toString(8),
    十进制: num.toString(10),
    十六进制: num.toString(16).toUpperCase(),
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex gap-4">
      <div class="w-32 shrink-0">
        <OdSelect
          v-model="base"
          :options="BASE_OPTIONS"
        />
      </div>
      <input
        v-model="input"
        type="text"
        placeholder="输入数值..."
        class="od-input flex-1 font-mono"
      >
      <button
        class="od-btn od-btn-primary shrink-0"
        @click="convert"
      >
        转换
      </button>
    </div>

    <div
      v-if="Object.keys(results).length > 0"
      class="grid grid-cols-2 gap-4"
    >
      <div
        v-for="(value, name) in results"
        :key="name"
        class="od-panel p-4"
      >
        <p class="text-muted text-sm mb-1">
          {{ name }}
        </p>
        <p class="text-fg font-mono text-lg">
          {{ value }}
        </p>
      </div>
    </div>
  </div>
</template>
