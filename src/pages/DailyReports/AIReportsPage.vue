<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import dailyReportsApi from '../../lib/daily-report-api'
import type { DailyReport } from '../../types/daily-report'
import ReportList from './components/ReportList.vue'
import ReportContent from './components/ReportContent.vue'
import Navbar from '../../components/Navbar.vue'

const selectedReport = ref<DailyReport | null>(null)

// 获取AI日报列表
const { data: reportsData, isLoading, isError } = useQuery({
  queryKey: ['daily-reports', 'ai'],
  queryFn: () => dailyReportsApi.getList({ type: 'ai', limit: 30 }),
})

// 列表加载完成且未选中时，自动选中第一条（替代 React 版 useEffect）
// ⚠️ 必须 immediate: true：vue-query 缓存命中时 data 在 setup 即同步填充，
// 非 immediate 的 watch 不触发；且 structural sharing 会让后台 refetch 保留原引用，watch 依然不触发
watch(
  reportsData,
  (data) => {
    if (data?.items?.length && !selectedReport.value) {
      selectedReport.value = data.items[0]
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-screen">
    <!-- 导航栏 -->
    <Navbar />

    <!-- 主内容 -->
    <main class="max-w-7xl mx-auto px-6 py-10">
      <!-- 页头 -->
      <div class="mb-8">
        <p class="eyebrow">
          AI Daily
        </p>
        <h2 class="font-display text-[clamp(1.7rem,3.2vw,2.3rem)] font-bold tracking-[-0.02em] leading-[1.2] mb-2">
          AI 情报早报
        </h2>
        <p class="text-muted max-w-[60ch]">
          AI / Agent / Claude Code 每日精选，通勤路上读完行业动态。
        </p>
      </div>

      <div class="flex gap-6 h-[calc(100vh-320px)] min-h-[480px]">
        <!-- 左侧：日报列表 -->
        <div class="w-56 flex-shrink-0 od-card overflow-hidden flex flex-col">
          <div class="px-4 py-3 border-b border-border">
            <h3 class="text-muted text-xs font-medium uppercase tracking-wider">
              历史日报
            </h3>
          </div>
          <div class="p-2 flex-1 overflow-hidden">
            <p
              v-if="isError"
              class="p-3 text-danger text-sm"
            >
              日报加载失败，请稍后重试
            </p>
            <ReportList
              v-else
              :reports="reportsData?.items || []"
              :selected-report="selectedReport"
              :is-loading="isLoading"
              @select="selectedReport = $event"
            />
          </div>
        </div>

        <!-- 右侧：日报内容 -->
        <div class="flex-1 od-card overflow-hidden">
          <ReportContent
            :report="selectedReport"
            :is-loading="isLoading"
            theme="ai"
          />
        </div>
      </div>
    </main>
  </div>
</template>
