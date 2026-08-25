<script setup lang="ts">
// 首页观察池小卡片：触发顶置标红，最多摆 5 条，详情跳 /stock-signals?tab=pool
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import stockWatchlistApi from '../lib/stock-watchlist-api'
import { useAuthStore } from '../stores/auth'
import AppIcon from './AppIcon.vue'

const auth = useAuthStore()

const { data: pool, isLoading } = useQuery({
  queryKey: ['stock-watchlist'],
  queryFn: () => stockWatchlistApi.list(),
  enabled: computed(() => auth.isAuthenticated),
})

const triggeredCount = computed(
  () => (pool.value ?? []).filter((i) => i.status === 'triggered').length,
)

// 触发的钉顶（后端已排前，这里再保险一道），最多 5 条
const topItems = computed(() => (pool.value ?? []).slice(0, 5))
</script>

<template>
  <div class="od-card p-6">
    <div class="flex items-center justify-between gap-4 mb-4">
      <h3 class="text-muted text-sm font-medium flex items-center gap-2">
        我的观察池
        <span
          v-if="triggeredCount"
          class="min-w-5 h-5 px-1 rounded-full bg-danger text-white text-xs font-bold inline-flex items-center justify-center"
        >{{ triggeredCount }}</span>
      </h3>
      <router-link
        v-if="auth.isAuthenticated"
        to="/stock-signals?tab=pool"
        class="text-accent-strong text-xs hover:underline inline-flex items-center gap-1"
      >
        管理
        <AppIcon
          name="arrow-right"
          :size="12"
        />
      </router-link>
    </div>

    <!-- 匿名 -->
    <p
      v-if="!auth.isAuthenticated"
      class="text-muted text-sm"
    >
      <router-link
        to="/login?redirect=/"
        class="text-accent-strong hover:underline"
      >
        登录
      </router-link>后可把 B 信号股票加入观察池，出 S 自动标红提醒。
    </p>

    <!-- 加载 -->
    <p
      v-else-if="isLoading"
      class="text-muted text-sm"
    >
      加载中…
    </p>

    <!-- 空池 -->
    <p
      v-else-if="!pool?.length"
      class="text-muted text-sm"
    >
      池子还是空的——去<router-link
        to="/stock-signals"
        class="text-accent-strong hover:underline"
      >
        今日 B 信号筛选
      </router-link>勾几只长期跟踪。
    </p>

    <!-- 池子列表（前 5 条） -->
    <ul v-else>
      <li
        v-for="item in topItems"
        :key="item.id"
        class="flex items-center gap-3 py-2.5 border-b border-border last:border-0 -mx-2 px-2 rounded-lg"
        :class="{ 'bg-danger/10': item.status === 'triggered' }"
      >
        <div class="flex-1 min-w-0">
          <span class="text-sm text-fg font-medium">{{ item.name || '—' }}</span>
          <span class="font-mono text-xs text-muted ml-2">{{ item.market.toUpperCase() }}{{ item.code }}</span>
        </div>
        <span
          v-if="item.status === 'triggered'"
          class="text-xs font-bold text-danger shrink-0"
        >S · {{ item.triggeredSignalDate }}</span>
        <span
          v-else
          class="text-xs text-muted shrink-0"
        >监控中</span>
      </li>
      <li
        v-if="pool.length > 5"
        class="pt-2.5 text-center"
      >
        <router-link
          to="/stock-signals?tab=pool"
          class="text-muted text-xs hover:text-fg"
        >
          还有 {{ pool.length - 5 }} 只，查看全部 →
        </router-link>
      </li>
    </ul>
  </div>
</template>
