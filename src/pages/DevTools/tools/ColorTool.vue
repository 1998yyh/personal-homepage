<script setup lang="ts">
import { computed, ref } from 'vue'

const hex = ref('#3b82f6')
const rgb = ref({ r: 59, g: 130, b: 246 })
const hsl = ref({ h: 217, s: 91, l: 60 })
const error = ref('')

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** 当前输入对应的合法颜色；非法输入时返回 null（色块/变量面板不展示错误值） */
const validHex = computed(() => {
  const rgbVal = hexToRgb(hex.value)
  return rgbVal ? hex.value : null
})

const updateFromHex = (newHex: string) => {
  const raw = newHex.trim()
  // 允许自由输入（含中间态），但只有合法时才同步 RGB/HSL 与色块
  const normalized = raw.startsWith('#') ? raw : `#${raw}`
  const rgbVal = hexToRgb(normalized)
  if (!rgbVal) {
    error.value = 'HEX 格式无效，应为 #RRGGBB'
    return
  }
  error.value = ''
  hex.value = normalized
  rgb.value = rgbVal
  hsl.value = rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b)
}

const onHexInput = (e: Event) => {
  updateFromHex((e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <div
        class="w-24 h-24 rounded-xl border border-border shadow-card"
        :style="{ backgroundColor: validHex || 'transparent' }"
      />
      <div>
        <input
          type="color"
          :value="validHex || '#000000'"
          class="w-12 h-10 cursor-pointer"
          @input="onHexInput"
        >
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="od-label">HEX</label>
        <input
          type="text"
          :value="hex"
          class="od-input font-mono"
          :class="{ err: !!error }"
          @input="onHexInput"
        >
        <p
          v-if="error"
          class="field-msg text-danger text-xs mt-1"
        >
          {{ error }}
        </p>
      </div>
      <div>
        <label class="od-label">RGB</label>
        <input
          type="text"
          :value="`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`"
          readonly
          class="od-input font-mono"
        >
      </div>
      <div>
        <label class="od-label">HSL</label>
        <input
          type="text"
          :value="`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`"
          readonly
          class="od-input font-mono"
        >
      </div>
    </div>

    <div
      v-if="validHex"
      class="od-panel p-3"
    >
      <p class="text-muted text-sm">
        CSS 变量:
      </p>
      <code class="text-accent-strong text-sm">--color: {{ validHex }};</code>
    </div>
  </div>
</template>
