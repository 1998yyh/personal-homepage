<script setup lang="ts">
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const input = ref('')
const output = ref('')
const error = ref('')

const encode = () => {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  output.value = input.value.replace(/[&<>"']/g, char => htmlEntities[char])
  error.value = ''
}

const decode = () => {
  const doc = new DOMParser().parseFromString(input.value, 'text/html')
  output.value = doc.documentElement.textContent || ''
  error.value = ''
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
