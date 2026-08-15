<script setup lang="ts">
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const input = ref('')
const output = ref('')
const error = ref('')

const format = () => {
  try {
    const parsed = JSON.parse(input.value)
    output.value = JSON.stringify(parsed, null, 2)
    error.value = ''
  } catch (e) {
    error.value = 'JSON 格式错误：' + (e instanceof Error ? e.message : String(e))
  }
}

const compress = () => {
  try {
    const parsed = JSON.parse(input.value)
    output.value = JSON.stringify(parsed)
    error.value = ''
  } catch (e) {
    error.value = 'JSON 格式错误：' + (e instanceof Error ? e.message : String(e))
  }
}

const escapeJson = () => {
  try {
    output.value = JSON.stringify(input.value)
    error.value = ''
  } catch {
    error.value = '转义失败'
  }
}

const buttons = [
  { label: '格式化', onClick: format },
  { label: '压缩', onClick: compress },
  { label: '转义', onClick: escapeJson },
]
</script>

<template>
  <ToolLayout
    v-model:input="input"
    :output="output"
    :error="error"
    :buttons="buttons"
    output-height="h-80"
  />
</template>
