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
const { data: reportsData, isLoading } = useQuery({
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
  <div class="min-h-screen bg-mesh relative overflow-hidden">
    <!-- 背景装饰 - AI主题色 -->
    <div
      class="orb orb-1"
      :style="{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }"
    />
    <div
      class="orb orb-2"
      :style="{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)' }"
    />
    <div
      class="orb orb-3"
      :style="{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)' }"
    />

    <!-- 导航栏 -->
    <Navbar />

    <!-- 主内容 -->
    <main class="relative z-10 max-w-7xl mx-auto px-4 py-4">
      <div class="flex gap-6 h-[calc(100vh-88px)]">
        <!-- 左侧：日报列表 -->
        <div class="w-56 flex-shrink-0 glass-dark rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-white/[0.06]">
            <h3 class="text-white/50 text-xs font-medium uppercase tracking-wider">
              历史日报
            </h3>
          </div>
          <div class="p-2 h-[calc(100%-48px)]">
            <ReportList
              :reports="reportsData?.items || []"
              :selected-report="selectedReport"
              :is-loading="isLoading"
              @select="selectedReport = $event"
            />
          </div>
        </div>

        <!-- 右侧：日报内容 -->
        <div class="flex-1 glass-dark rounded-xl overflow-hidden">
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
