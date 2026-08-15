<script setup lang="ts">
import { ref } from 'vue'

const uuids = ref<string[]>([])
const count = ref(5)

/** UUID v4：安全上下文用 crypto.randomUUID；http 局域网访问降级 getRandomValues 构造 */
const randomUuid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

const generate = () => {
  const total = Math.max(1, Math.min(100, count.value))
  uuids.value = Array.from({ length: total }, randomUuid)
}

const copyAll = () => {
  navigator.clipboard?.writeText(uuids.value.join('\n')).catch(() => {})
}

const copyOne = (uuid: string) => {
  navigator.clipboard?.writeText(uuid).catch(() => {})
}

const onCountInput = (e: Event) => {
  count.value = Math.max(1, Math.min(100, parseInt((e.target as HTMLInputElement).value) || 1))
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <label class="text-muted text-sm">生成数量:</label>
      <input
        type="number"
        :value="count"
        min="1"
        max="100"
        class="od-input !w-20"
        @input="onCountInput"
      >
      <button
        class="od-btn od-btn-primary"
        @click="generate"
      >
        生成
      </button>
      <button
        v-if="uuids.length > 0"
        class="od-btn od-btn-soft"
        @click="copyAll"
      >
        复制全部
      </button>
    </div>

    <div
      v-if="uuids.length > 0"
      class="od-panel p-4 space-y-2"
    >
      <div
        v-for="(uuid, i) in uuids"
        :key="i"
        class="flex items-center justify-between group"
      >
        <code class="text-fg/85 font-mono text-sm">{{ uuid }}</code>
        <button
          class="opacity-0 group-hover:opacity-100 px-2 py-1 text-muted hover:text-fg text-xs transition-opacity cursor-pointer"
          @click="copyOne(uuid)"
        >
          复制
        </button>
      </div>
    </div>
  </div>
</template>
