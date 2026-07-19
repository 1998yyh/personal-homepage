<script setup lang="ts">
import type { DailyReport } from '../../../types/daily-report'

defineProps<{
  reports: DailyReport[]
  selectedReport: DailyReport | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  select: [report: DailyReport]
}>()

// 格式化日期显示
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return { month, day, weekDay }
}
</script>

<template>
  <!-- 加载态 -->
  <div v-if="isLoading" class="space-y-1">
    <div v-for="i in 5" :key="i" class="h-14 rounded-lg bg-white/5 animate-pulse"></div>
  </div>

  <!-- 空态 -->
  <div v-else-if="reports.length === 0" class="text-center py-12">
    <div class="text-4xl mb-3">📭</div>
    <p class="text-white/40 text-sm">暂无日报</p>
  </div>

  <!-- 列表 -->
  <div v-else class="space-y-1 overflow-y-auto h-full pr-1">
    <button
      v-for="report in reports"
      :key="report.id"
      class="w-full text-left transition-all duration-150 group relative py-3 px-3 rounded-lg"
      :class="selectedReport?.id === report.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'"
      @click="emit('select', report)"
    >
      <!-- 日期行 -->
      <div class="flex items-baseline gap-2 mb-1">
        <span
          class="text-base font-medium"
          :class="selectedReport?.id === report.id ? 'text-white' : 'text-white/70'"
        >
          {{ formatDate(report.date).month }}月{{ formatDate(report.date).day }}日
        </span>
        <span
          class="text-xs"
          :class="selectedReport?.id === report.id ? 'text-white/50' : 'text-white/30'"
        >
          {{ formatDate(report.date).weekDay }}
        </span>
      </div>

      <!-- 标题预览 -->
      <p
        class="text-xs truncate"
        :class="selectedReport?.id === report.id ? 'text-white/60' : 'text-white/30'"
      >
        {{ report.title }}
      </p>
    </button>
  </div>
</template>
