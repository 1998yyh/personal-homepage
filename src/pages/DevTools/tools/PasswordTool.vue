<script setup lang="ts">
import { ref } from 'vue'

const password = ref('')
const length = ref(16)
const options = ref({
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
})

const optionItems: { key: keyof typeof options.value; label: string }[] = [
  { key: 'uppercase', label: '大写字母 A-Z' },
  { key: 'lowercase', label: '小写字母 a-z' },
  { key: 'numbers', label: '数字 0-9' },
  { key: 'symbols', label: '符号 !@#$...' },
]

const generate = () => {
  let chars = ''
  if (options.value.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (options.value.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (options.value.numbers) chars += '0123456789'
  if (options.value.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!chars) {
    password.value = '请至少选择一种字符类型'
    return
  }

  let result = ''
  for (let i = 0; i < length.value; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  password.value = result
}

const getStrength = (pwd: string) => {
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (pwd.length >= 16) score++
  if (/[a-z]/.test(pwd)) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++

  if (score <= 3) return { label: '弱', color: 'text-red-400' }
  if (score <= 5) return { label: '中', color: 'text-yellow-400' }
  return { label: '强', color: 'text-green-400' }
}

const copyPassword = () => {
  navigator.clipboard.writeText(password.value)
}

const toggleOption = (key: keyof typeof options.value, e: Event) => {
  options.value = { ...options.value, [key]: (e.target as HTMLInputElement).checked }
}

const onLengthInput = (e: Event) => {
  length.value = parseInt((e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <label class="text-white/60 w-20">长度:</label>
      <input
        type="range"
        :value="length"
        min="4"
        max="64"
        class="flex-1"
        @input="onLengthInput"
      >
      <span class="text-white w-8">{{ length }}</span>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <label
        v-for="{ key, label } in optionItems"
        :key="key"
        class="flex items-center gap-2 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="options[key]"
          class="w-4 h-4"
          @change="toggleOption(key, $event)"
        >
        <span class="text-white/70 text-sm">{{ label }}</span>
      </label>
    </div>

    <button
      class="w-full py-3 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 font-medium"
      @click="generate"
    >
      生成密码
    </button>

    <div
      v-if="password"
      class="bg-white/5 rounded-lg p-4"
    >
      <div class="flex items-center justify-between mb-2">
        <code class="text-white font-mono text-lg break-all">{{ password }}</code>
        <button
          class="px-3 py-1 bg-white/10 text-white rounded hover:bg-white/20 text-sm"
          @click="copyPassword"
        >
          复制
        </button>
      </div>
      <p
        class="text-sm"
        :class="getStrength(password).color"
      >
        强度: {{ getStrength(password).label }}
      </p>
    </div>
  </div>
</template>
