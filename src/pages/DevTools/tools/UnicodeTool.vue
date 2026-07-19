<script setup lang="ts">
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const input = ref('')
const output = ref('')
const error = ref('')

const encode = () => {
  output.value = input.value
    .split('')
    .map(char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('')
  error.value = ''
}

const decode = () => {
  try {
    output.value = input.value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    error.value = ''
  } catch {
    error.value = '解码失败'
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
