<script setup lang="ts">
import { ref } from 'vue'

const input = ref('')
const hashes = ref<Record<string, string>>({})
const error = ref('')
const calculating = ref(false)

const calculate = async () => {
  if (!input.value) return
  if (!crypto.subtle) {
    // WebCrypto 仅在安全上下文（https / localhost）可用，局域网 http 访问时降级为提示
    error.value = '当前环境不支持 WebCrypto（需通过 https 或 localhost 访问），无法计算 Hash'
    hashes.value = {}
    return
  }
  error.value = ''
  calculating.value = true
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(input.value)

    const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
    // 各算法互不依赖，并行计算
    const results = await Promise.all(
      algorithms.map(async (alg) => {
        const hashBuffer = await crypto.subtle.digest(alg, data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return [alg, hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')] as const
      }),
    )
    hashes.value = Object.fromEntries(results)
  } catch {
    error.value = 'Hash 计算失败，请重试'
  } finally {
    calculating.value = false
  }
}

const copyHash = (hash: string) => {
  navigator.clipboard?.writeText(hash).catch(() => {})
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
      :disabled="calculating"
      @click="calculate"
    >
      {{ calculating ? '计算中…' : '计算 Hash' }}
    </button>

    <p
      v-if="error"
      class="text-danger text-sm"
    >
      {{ error }}
    </p>

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
