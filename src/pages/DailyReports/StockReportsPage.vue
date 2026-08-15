<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import dailyReportsApi from '../../lib/daily-report-api'
import type { DailyReport } from '../../types/daily-report'
import ReportList from './components/ReportList.vue'
import ReportContent from './components/ReportContent.vue'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'

const selectedReport = ref<DailyReport | null>(null)

// 获取股票日报列表
const { data: reportsData, isLoading, isError } = useQuery({
  queryKey: ['daily-reports', 'stock'],
  queryFn: () => dailyReportsApi.getList({ type: 'stock', limit: 30 }),
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
      <!-- 页头（投资板块用领域点缀色 domain） -->
      <div class="mb-8">
        <p
          class="eyebrow"
          style="color: var(--domain)"
        >
          Market Daily
        </p>
        <h2 class="font-display text-[clamp(1.7rem,3.2vw,2.3rem)] font-bold tracking-[-0.02em] leading-[1.2] mb-2">
          股票资讯日报
        </h2>
        <p class="text-muted max-w-[60ch]">
          A股 / 港股 每日市场精选，复盘纪律从每天十分钟开始。
        </p>
      </div>

      <!-- B 信号筛选入口 -->
      <router-link
        to="/stock-signals"
        class="od-card p-4 mb-6 flex items-center gap-3.5 transition-shadow hover:shadow-lift group"
      >
        <div
          class="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white"
          style="background: var(--domain)"
        >
          <AppIcon
            name="trending-up"
            :size="19"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-fg font-medium text-sm">
            今日 B 信号筛选
          </p>
          <p class="text-muted text-xs mt-0.5 truncate">
            扫描沪深主板非 ST 的新浪多空信号，服务端缓存、历史可查
          </p>
        </div>
        <AppIcon
          name="arrow-right"
          :size="16"
          class="text-muted transition-transform group-hover:translate-x-0.5 shrink-0"
        />
      </router-link>

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
            theme="stock"
          />
        </div>
      </div>
    </main>
  </div>
</template>
