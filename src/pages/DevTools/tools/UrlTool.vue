<script setup lang="ts">
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const input = ref('')
const output = ref('')
const error = ref('')

const encode = () => {
  try {
    output.value = encodeURIComponent(input.value)
    error.value = ''
  } catch {
    error.value = '编码失败'
  }
}

const decode = () => {
  try {
    output.value = decodeURIComponent(input.value)
    error.value = ''
  } catch {
    error.value = '解码失败：输入不是有效的 URL 编码字符串'
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
