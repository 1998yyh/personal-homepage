<script setup lang="ts">
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const input = ref('')
const output = ref('')
const error = ref('')

const encode = () => {
  try {
    // TextEncoder 直接产 UTF-8 字节，替代已废弃的 escape/unescape 方案
    const bytes = new TextEncoder().encode(input.value)
    let binary = ''
    bytes.forEach((b) => {
      binary += String.fromCharCode(b)
    })
    output.value = btoa(binary)
    error.value = ''
  } catch {
    error.value = '编码失败'
  }
}

const decode = () => {
  try {
    const binary = atob(input.value.trim())
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    // fatal: true —— 非 UTF-8 字节序列抛错进 catch，避免静默替换成乱码
    output.value = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    error.value = ''
  } catch {
    error.value = '解码失败：输入不是有效的 Base64 字符串'
  }
}

const buttons = [
  { label: '编码', onClick: encode },
  { label: '解码', onClick: decode },
]
</script>

<template>
  <ToolLayout
    v-model:input="input"
    :output="output"
    :error="error"
    :buttons="buttons"
  />
</template>
