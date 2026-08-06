<script setup lang="ts">
import { ref } from 'vue'

const timestamp = ref('')
const dateStr = ref('')
const results = ref<string[]>([])

const timestampToDate = () => {
  const ts = parseInt(timestamp.value)
  if (isNaN(ts)) return

  const date = new Date(ts)
  const date10 = new Date(ts * 1000)

  results.value = [
    `毫秒时间戳: ${ts}`,
    `本地时间: ${date.toLocaleString('zh-CN')}`,
    `ISO 格式: ${date.toISOString()}`,
    `UTC 时间: ${date.toUTCString()}`,
    `---`,
    `如果输入的是秒级时间戳:`,
    `本地时间: ${date10.toLocaleString('zh-CN')}`,
    `ISO 格式: ${date10.toISOString()}`,
  ]
}

const dateToTimestamp = () => {
  const date = new Date(dateStr.value)
  if (isNaN(date.getTime())) return

  results.value = [
    `毫秒时间戳: ${date.getTime()}`,
    `秒级时间戳: ${Math.floor(date.getTime() / 1000)}`,
    `本地时间: ${date.toLocaleString('zh-CN')}`,
    `ISO 格式: ${date.toISOString()}`,
  ]
}

const setNow = () => {
  // React 版 now = Date.now() 在每次渲染时重算，这里在点击时取值以保持“当前”语义
  const now = Date.now()
  timestamp.value = now.toString()
  const date = new Date(now)
  results.value = [
    `当前毫秒时间戳: ${now}`,
    `当前秒级时间戳: ${Math.floor(now / 1000)}`,
    `本地时间: ${date.toLocaleString('zh-CN')}`,
    `ISO 格式: ${date.toISOString()}`,
  ]
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex gap-4">
      <button
        class="od-btn od-btn-primary"
        @click="setNow"
      >
        获取当前时间戳
      </button>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <div>
        <label class="od-label">时间戳 → 日期</label>
        <div class="flex gap-2">
          <input
            v-model="timestamp"
            type="text"
            placeholder="输入时间戳..."
            class="od-input flex-1 font-mono"
          >
          <button
            class="od-btn od-btn-soft shrink-0"
            @click="timestampToDate"
          >
            转换
          </button>
        </div>
      </div>

      <div>
        <label class="od-label">日期 → 时间戳</label>
        <div class="flex gap-2">
          <input
            v-model="dateStr"
            type="datetime-local"
            class="od-input flex-1"
          >
          <button
            class="od-btn od-btn-soft shrink-0"
            @click="dateToTimestamp"
          >
            转换
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="results.length > 0"
      class="od-panel p-4"
    >
      <div
        v-for="(line, i) in results"
        :key="i"
        class="text-sm font-mono"
        :class="line.startsWith('---') ? 'text-muted/50 my-2' : 'text-fg/85'"
      >
        {{ line }}
      </div>
    </div>
  </div>
</template>
