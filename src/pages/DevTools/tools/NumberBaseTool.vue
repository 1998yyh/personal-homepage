<script setup lang="ts">
import { ref } from 'vue'

const input = ref('255')
const base = ref(10)
const results = ref<Record<string, string>>({})

const convert = () => {
  const num = parseInt(input.value, base.value)
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
      <select
        v-model.number="base"
        class="px-3 py-2 bg-white/5 rounded-lg text-white border border-white/10"
      >
        <option :value="2">
          二进制
        </option>
        <option :value="8">
          八进制
        </option>
        <option :value="10">
          十进制
        </option>
        <option :value="16">
          十六进制
        </option>
      </select>
      <input
        v-model="input"
        type="text"
        placeholder="输入数值..."
        class="flex-1 px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10"
      >
      <button
        class="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
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
        class="bg-white/5 rounded-lg p-4"
      >
        <p class="text-white/40 text-sm mb-1">
          {{ name }}
        </p>
        <p class="text-white font-mono text-lg">
          {{ value }}
        </p>
      </div>
    </div>
  </div>
</template>
