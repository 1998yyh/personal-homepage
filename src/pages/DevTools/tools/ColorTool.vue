<script setup lang="ts">
import { ref } from 'vue'

const hex = ref('#3b82f6')
const rgb = ref({ r: 59, g: 130, b: 246 })
const hsl = ref({ h: 217, s: 91, l: 60 })

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

const updateFromHex = (newHex: string) => {
  hex.value = newHex
  const rgbVal = hexToRgb(newHex)
  if (rgbVal) {
    rgb.value = rgbVal
    hsl.value = rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b)
  }
}

const onHexInput = (e: Event) => {
  updateFromHex((e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <div
        class="w-24 h-24 rounded-xl shadow-lg"
        :style="{ backgroundColor: hex }"
      />
      <div>
        <input
          type="color"
          :value="hex"
          class="w-12 h-10 cursor-pointer"
          @input="onHexInput"
        >
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-white/60 text-sm mb-2">HEX</label>
        <input
          type="text"
          :value="hex"
          class="w-full px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10"
          @input="onHexInput"
        >
      </div>
      <div>
        <label class="block text-white/60 text-sm mb-2">RGB</label>
        <input
          type="text"
          :value="`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`"
          readonly
          class="w-full px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10"
        >
      </div>
      <div>
        <label class="block text-white/60 text-sm mb-2">HSL</label>
        <input
          type="text"
          :value="`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`"
          readonly
          class="w-full px-3 py-2 bg-white/5 rounded-lg text-white font-mono border border-white/10"
        >
      </div>
    </div>

    <div class="bg-white/5 rounded-lg p-3">
      <p class="text-white/40 text-sm">
        CSS 变量:
      </p>
      <code class="text-cyan-400 text-sm">--color: {{ hex }};</code>
    </div>
  </div>
</template>
