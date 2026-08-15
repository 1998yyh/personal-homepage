<script setup lang="ts">
import { ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'

const input = ref('')
const output = ref('')
const error = ref('')

const encode = () => {
  // 按码点迭代（Array.from 正确处理代理对）：BMP 字符用 \uXXXX，增补平面用 \u{XXXXX}
  output.value = Array.from(input.value, (char) => {
    const codePoint = char.codePointAt(0)!
    return codePoint > 0xffff
      ? `\\u{${codePoint.toString(16)}}`
      : `\\u${codePoint.toString(16).padStart(4, '0')}`
  }).join('')
  error.value = ''
}

const decode = () => {
  // 支持 \u{1F600}（码点）与 \uD83D\uDE00（传统代理对）两种写法
  let text = input.value.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex: string) =>
    String.fromCodePoint(parseInt(hex, 16)),
  )
  text = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
  // 孤立代理位替换为 U+FFFD，避免输出乱码
  output.value = text.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    '\uFFFD',
  )
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
