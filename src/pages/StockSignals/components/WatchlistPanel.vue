<script setup lang="ts">
// 观察池面板：池子列表 + 出 S 标红 + 移除 + 手动立即检查
import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import stockWatchlistApi from '../../../lib/stock-watchlist-api'
import { useAuthStore } from '../../../stores/auth'
import { showToast } from '../../../composables/useToast'
import AppIcon from '../../../components/AppIcon.vue'

const auth = useAuthStore()
const queryClient = useQueryClient()

const { data: pool, isLoading, isError } = useQuery({
  queryKey: ['stock-watchlist'],
  queryFn: () => stockWatchlistApi.list(),
  enabled: computed(() => auth.isAuthenticated),
})

const triggeredCount = computed(
  () => (pool.value ?? []).filter((i) => i.status === 'triggered').length,
)

const invalidate = () => queryClient.invalidateQueries({ queryKey: ['stock-watchlist'] })

const removeMutation = useMutation({
  mutationFn: (id: string) => stockWatchlistApi.remove(id),
  onSuccess: invalidate,
  onError: () => showToast('移除失败，请稍后重试', 'error'),
})

const checkMutation = useMutation({
  mutationFn: () => stockWatchlistApi.check(),
  onSuccess: (res) => {
    showToast(
      res.triggered ? `检查完成：${res.triggered} 只出 S` : '检查完成：池内暂无 S 信号',
      'success',
    )
    invalidate()
  },
  onError: () => showToast('检查失败，请稍后重试', 'error'),
})
</script>

<template>
  <!-- 匿名：登录引导 -->
  <div
    v-if="!auth.isAuthenticated"
    class="od-card p-6 text-center"
  >
    <p class="text-fg font-medium mb-1.5">
      观察池是登录用户的私有功能
    </p>
    <p class="text-muted text-sm mb-5">
      登录后可勾选 B 信号股票长期跟踪，出 S 自动标红提醒
    </p>
    <router-link
      to="/login?redirect=/stock-signals?tab=pool"
      class="od-btn od-btn-primary mx-auto"
    >
      去登录
    </router-link>
  </div>

  <div v-else>
    <!-- 出 S 横幅 -->
    <div
      v-if="triggeredCount"
      class="od-card p-3.5 mb-4 text-sm font-medium text-danger"
    >
      有 {{ triggeredCount }} 只已出 S——红了的就是该剔除的
    </div>

    <!-- 加载 / 错误 -->
    <div
      v-if="isLoading"
      class="od-card p-6 text-center text-muted text-sm"
    >
      观察池加载中…
    </div>
    <div
      v-else-if="isError"
      class="od-card p-6 text-center text-muted text-sm"
    >
      加载失败，请刷新重试
    </div>

    <!-- 池子表格 -->
    <div
      v-else
      class="od-card overflow-x-auto p-0"
    >
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-border">
            <th class="text-muted text-xs font-medium px-4 py-3">
              股票代码
            </th>
            <th class="text-muted text-xs font-medium px-4 py-3">
              股票名称
            </th>
            <th class="text-muted text-xs font-medium px-4 py-3">
              入池 B 日期
            </th>
            <th class="text-muted text-xs font-medium px-4 py-3">
              状态
            </th>
            <th class="text-muted text-xs font-medium px-4 py-3 text-right">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in pool"
            :key="item.id"
            class="border-b border-border last:border-0"
            :class="{ 'bg-danger/10': item.status === 'triggered' }"
          >
            <td class="px-4 py-3 font-mono text-sm text-fg">
              {{ item.market.toUpperCase() }}{{ item.code }}
            </td>
            <td class="px-4 py-3 text-sm text-fg">
              {{ item.name || '—' }}
            </td>
            <td class="px-4 py-3 font-mono text-sm text-muted">
              {{ item.entrySignalDate }}
            </td>
            <td class="px-4 py-3 text-sm">
              <span
                v-if="item.status === 'triggered'"
                class="font-bold text-danger"
              >S · {{ item.triggeredSignalDate }}</span>
              <span
                v-else
                class="text-muted"
              >监控中</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                class="od-btn od-btn-ghost !py-1 !px-2.5 text-xs"
                :disabled="removeMutation.isPending.value"
                @click="removeMutation.mutate(item.id)"
              >
                移除
              </button>
            </td>
          </tr>
          <tr v-if="!pool?.length">
            <td
              colspan="5"
              class="px-4 py-8 text-center text-muted text-sm"
            >
              池子空了——回「B 信号筛选」勾几只进来
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 页脚：容量 + 手动检查 -->
    <div class="flex items-center justify-between gap-4 mt-3 flex-wrap">
      <p class="text-muted text-xs">
        {{ pool?.length ?? 0 }} / 100 · 交易日 10:00 与 14:50 自动检查 S
      </p>
      <button
        class="od-btn od-btn-ghost !py-1.5 !px-3 text-xs"
        :disabled="checkMutation.isPending.value || !pool?.length"
        @click="checkMutation.mutate()"
      >
        <AppIcon
          name="search"
          :size="13"
        />
        {{ checkMutation.isPending.value ? '检查中…' : '立即检查' }}
      </button>
    </div>
  </div>
</template>
