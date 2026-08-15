<script setup lang="ts">
import { ref } from 'vue'

const password = ref('')
const error = ref('')
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
  error.value = ''
  let chars = ''
  if (options.value.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (options.value.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (options.value.numbers) chars += '0123456789'
  if (options.value.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!chars) {
    // 校验错误与结果字段分离，不把提示文案当密码展示
    password.value = ''
    error.value = '请至少选择一种字符类型'
    return
  }

  // 密码学安全随机（getRandomValues 非安全上下文也可用），拒绝采样避免模偏差
  const maxValid = 256 - (256 % chars.length)
  let result = ''
  while (result.length < length.value) {
    const bytes = new Uint8Array(length.value - result.length)
    crypto.getRandomValues(bytes)
    for (const b of bytes) {
      if (b < maxValid) result += chars.charAt(b % chars.length)
    }
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

  if (score <= 3) return { label: '弱', color: 'text-danger' }
  if (score <= 5) return { label: '中', color: 'text-warn' }
  return { label: '强', color: 'text-success' }
}

const copyPassword = () => {
  navigator.clipboard?.writeText(password.value).catch(() => {})
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
      <label class="text-muted text-sm w-20">长度:</label>
      <input
        type="range"
        :value="length"
        min="4"
        max="64"
        class="flex-1 accent-accent"
        @input="onLengthInput"
      >
      <span class="text-fg w-8 tabular-nums">{{ length }}</span>
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
          class="w-4 h-4 accent-accent"
          @change="toggleOption(key, $event)"
        >
        <span class="text-fg/80 text-sm">{{ label }}</span>
      </label>
    </div>

    <button
      class="od-btn od-btn-primary w-full"
      @click="generate"
    >
      生成密码
    </button>

    <p
      v-if="error"
      class="text-danger text-sm"
    >
      {{ error }}
    </p>

    <div
      v-if="password"
      class="od-panel p-4"
    >
      <div class="flex items-center justify-between gap-4 mb-2">
        <code class="text-fg font-mono text-lg break-all">{{ password }}</code>
        <button
          class="od-btn od-btn-soft shrink-0 !px-3 !py-1.5 !text-[13px]"
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
