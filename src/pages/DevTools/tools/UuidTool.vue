<script setup lang="ts">
import { ref } from 'vue'

const uuids = ref<string[]>([])
const count = ref(5)

const generate = () => {
  const newUuids = []
  for (let i = 0; i < count.value; i++) {
    newUuids.push(crypto.randomUUID())
  }
  uuids.value = newUuids
}

const copyAll = () => {
  navigator.clipboard.writeText(uuids.value.join('\n'))
}

const copyOne = (uuid: string) => {
  navigator.clipboard.writeText(uuid)
}

const onCountInput = (e: Event) => {
  count.value = Math.max(1, Math.min(100, parseInt((e.target as HTMLInputElement).value) || 1))
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <label class="text-white/60">生成数量:</label>
      <input
        type="number"
        :value="count"
        min="1"
        max="100"
        class="w-20 px-3 py-2 bg-white/5 rounded-lg text-white border border-white/10"
        @input="onCountInput"
      >
      <button
        class="px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
        @click="generate"
      >
        生成
      </button>
      <button
        v-if="uuids.length > 0"
        class="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
        @click="copyAll"
      >
        复制全部
      </button>
    </div>

    <div
      v-if="uuids.length > 0"
      class="bg-white/5 rounded-lg p-4 space-y-2"
    >
      <div
        v-for="(uuid, i) in uuids"
        :key="i"
        class="flex items-center justify-between group"
      >
        <code class="text-white/80 font-mono text-sm">{{ uuid }}</code>
        <button
          class="opacity-0 group-hover:opacity-100 px-2 py-1 text-white/40 hover:text-white text-xs transition-opacity"
          @click="copyOne(uuid)"
        >
          复制
        </button>
      </div>
    </div>
  </div>
</template>
