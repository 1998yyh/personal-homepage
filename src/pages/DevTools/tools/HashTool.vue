<script setup lang="ts">
import { ref } from 'vue'

const input = ref('')
const hashes = ref<Record<string, string>>({})

const calculate = async () => {
  if (!input.value) return

  const encoder = new TextEncoder()
  const data = encoder.encode(input.value)

  const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
  const results: Record<string, string> = {}

  for (const alg of algorithms) {
    const hashBuffer = await crypto.subtle.digest(alg, data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    results[alg] = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  hashes.value = results
}

const copyHash = (hash: string) => {
  navigator.clipboard.writeText(hash)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <label class="od-label">输入文本</label>
      <textarea
        v-model="input"
        placeholder="输入要计算 Hash 的文本..."
        class="od-input h-32 font-mono !text-[13px] resize-none"
      />
    </div>

    <button
      class="od-btn od-btn-primary"
      @click="calculate"
    >
      计算 Hash
    </button>

    <div
      v-if="Object.keys(hashes).length > 0"
      class="space-y-4"
    >
      <div
        v-for="(hash, alg) in hashes"
        :key="alg"
        class="od-panel p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <p class="text-muted text-sm">
            {{ alg }}
          </p>
          <button
            class="text-muted hover:text-fg text-xs transition-colors cursor-pointer"
            @click="copyHash(hash)"
          >
            复制
          </button>
        </div>
        <p class="text-fg font-mono text-xs break-all">
          {{ hash }}
        </p>
      </div>
    </div>
  </div>
</template>
