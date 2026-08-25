<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import stockSignalsApi from '../../lib/stock-signals-api'
import stockWatchlistApi from '../../lib/stock-watchlist-api'
import type { BSignalItem, ScanRun, SignalDateEntry } from '../../types/stock-signal'
import { useAuthStore } from '../../stores/auth'
import { showToast } from '../../composables/useToast'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import WatchlistPanel from './components/WatchlistPanel.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 北京时间今天（与原页面 chinaToday 逻辑一致）
const chinaToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const v = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
  return `${v.year}-${v.month}-${v.day}`
}
const today = chinaToday()

/** 是否周末（按日历日判断） */
const isWeekend = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day === 0 || day === 6
}

/** 周末无交易：回溯到最近交易日（周六 -1 天，周日 -2 天） */
const snapToTradingDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return d.toISOString().slice(0, 10)
}

// ---- 页面 Tab：B 信号筛选 / 我的观察池（?tab=pool 直达，切换同步回 URL）----
const tab = ref<'scan' | 'pool'>(route.query.tab === 'pool' ? 'pool' : 'scan')
watch(tab, (v) => {
  void router.replace({ query: v === 'pool' ? { tab: 'pool' } : {} })
})

// ---- 查询条件 ----
const queryDate = ref(snapToTradingDay(today))
const mode = ref<'full' | 'codes'>('full')
const codesText = ref('')

// ---- 结果与状态 ----
const items = ref<BSignalItem[]>([])
const stats = ref<{ found: number; checked: number; total: number; scannedAt: string } | null>(null)
const warnings = ref<string[]>([])
const notScanned = ref(false) // 该日期无缓存数据
const loading = ref(false) // 读取缓存中
const error = ref('')

// ---- 异步任务进度 ----
const activeRun = ref<ScanRun | null>(null)
const scanning = computed(() => !!activeRun.value)
let pollTimer: ReturnType<typeof setTimeout> | null = null

// 异步竞态守卫：每次加载/扫描自增序号，只有最新序号的结果才允许写入 UI，
// 避免「先点 A 后点 B，A 后返回覆盖 B 数据」与扫描轮询晚到覆盖新选择的日期
let requestSeq = 0

// ---- 历史日期 ----
const dates = ref<SignalDateEntry[]>([])

// ---- 观察池（登录用户私有；服务端状态走 vue-query，与 WatchlistPanel 共享缓存）----
const queryClient = useQueryClient()
const { data: watchlist } = useQuery({
  queryKey: ['stock-watchlist'],
  queryFn: () => stockWatchlistApi.list(),
  enabled: computed(() => auth.isAuthenticated),
})
const triggeredCount = computed(
  () => (watchlist.value ?? []).filter((i) => i.status === 'triggered').length,
)
const poolCodes = computed(() => new Set((watchlist.value ?? []).map((i) => i.code)))

// ---- B 结果勾选入池 ----
const checked = ref<string[]>([])
const checkable = computed(() => items.value.filter((i) => !poolCodes.value.has(i.code)))
const allChecked = computed(
  () => checkable.value.length > 0 && checked.value.length === checkable.value.length,
)
const toggleCheck = (code: string) => {
  checked.value = checked.value.includes(code)
    ? checked.value.filter((c) => c !== code)
    : [...checked.value, code]
}
const toggleAll = () => {
  checked.value = allChecked.value ? [] : checkable.value.map((i) => i.code)
}
// 换日期/换结果后勾选作废，防止把 A 日期的勾选带进 B 日期入池
watch(items, () => {
  checked.value = []
})

const addMutation = useMutation({
  mutationFn: () =>
    stockWatchlistApi.add(
      items.value
        .filter((i) => checked.value.includes(i.code))
        .map((i) => ({
          code: i.code,
          market: i.market,
          name: i.name,
          entrySignalDate: queryDate.value,
        })),
    ),
  onSuccess: (res) => {
    checked.value = []
    // 响应即入池后的完整池子，直接写缓存省一次往返
    queryClient.setQueryData(['stock-watchlist'], res.items)
    const notes: string[] = []
    if (res.added.length) notes.push(`入池 ${res.added.length} 只`)
    if (res.duplicated.length) notes.push(`${res.duplicated.length} 只已在池被跳过`)
    if (res.invalid.length) notes.push(`${res.invalid.length} 只代码无效`)
    if (res.overflow.length) notes.push(`超 100 上限，${res.overflow.length} 只未入池`)
    showToast(notes.join('；') || '没有可入池的股票', res.added.length ? 'success' : 'error')
  },
  onError: () => showToast('入池失败，请稍后重试', 'error'),
})

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('zh-CN', { hour12: false })

const clearPoll = () => {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

const resetResult = () => {
  items.value = []
  stats.value = null
  warnings.value = []
  notScanned.value = false
  error.value = ''
}

/** 读取某日缓存结果（公开接口；404 = 尚未扫描） */
const loadByDate = async (date: string) => {
  const seq = ++requestSeq
  clearPoll()
  activeRun.value = null
  resetResult()
  loading.value = true
  try {
    const data = await stockSignalsApi.getByDate(date)
    if (seq !== requestSeq) return // 过期响应：期间已发起更新的请求，丢弃
    items.value = data.items
    stats.value = {
      found: data.found,
      checked: data.checked,
      total: data.total,
      scannedAt: data.scannedAt,
    }
    if (data.failedCodes.length) {
      warnings.value = [`有 ${data.failedCodes.length} 只股票读取失败：${data.failedCodes.slice(0, 10).join('、')}${data.failedCodes.length > 10 ? '…' : ''}`]
    }
  } catch (e) {
    if (seq !== requestSeq) return
    const status = (e as { response?: { status?: number } }).response?.status
    if (status === 404) {
      notScanned.value = true
    } else {
      error.value = '查询失败，请稍后重试'
    }
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

const loadDates = async () => {
  try {
    dates.value = await stockSignalsApi.getDates()
  } catch {
    // 历史列表失败不阻塞主流程
  }
}

/** 轮询任务进度（2s 间隔）；seq 为发起扫描时的序号，过期即停轮询丢弃结果 */
const pollRun = (runId: string, seq: number) => {
  clearPoll()
  const tick = async () => {
    try {
      const { run, items: doneItems } = await stockSignalsApi.getRun(runId)
      if (seq !== requestSeq) return // 期间用户切了日期/发起了新扫描：丢弃并停止
      activeRun.value = { ...run }
      if (run.status === 'done') {
        clearPoll()
        activeRun.value = null
        items.value = doneItems ?? []
        stats.value = {
          found: run.found,
          checked: run.checked,
          total: run.total,
          scannedAt: run.updatedAt,
        }
        if (run.failedCodes?.length) {
          warnings.value = [`有 ${run.failedCodes.length} 只股票读取失败`]
        }
        loadDates()
        return
      }
      if (run.status === 'failed') {
        clearPoll()
        activeRun.value = null
        error.value = '扫描任务失败，请稍后重试'
        return
      }
      pollTimer = setTimeout(tick, 2000)
    } catch {
      if (seq !== requestSeq) return
      clearPoll()
      activeRun.value = null
      error.value = '进度查询失败，请刷新页面'
    }
  }
  void tick()
}

/** 发起扫描（全市场 / 指定代码 / 强制刷新共用入口） */
const scan = async (refresh = false) => {
  const seq = ++requestSeq
  if (!auth.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: '/stock-signals' } })
    return
  }
  clearPoll()
  activeRun.value = null
  resetResult()
  // 兜底：周末日期先回溯（正常路径 onDateChange 已处理）
  if (isWeekend(queryDate.value)) {
    queryDate.value = snapToTradingDay(queryDate.value)
    warnings.value = [`周末没有交易数据，已回溯到 ${queryDate.value}`]
  }
  loading.value = true

  try {
    if (mode.value === 'codes') {
      const codes = codesText.value.split(/[\s,，;；]+/).filter(Boolean)
      if (!codes.length) {
        error.value = '请输入至少一个股票代码'
        loading.value = false
        return
      }
      const { result } = await stockSignalsApi.requestScan({
        date: queryDate.value,
        codes,
        refresh,
      })
      if (seq !== requestSeq) return // 过期响应：丢弃
      if (result) {
        items.value = result.items
        stats.value = {
          found: result.items.length,
          checked: result.fetchedCount + result.cachedCount,
          total: result.requested,
          scannedAt: new Date().toISOString(),
        }
        const w: string[] = []
        if (result.invalid.length) w.push(`已忽略无效代码：${result.invalid.join('、')}`)
        if (result.failed.length) w.push(`有 ${result.failed.length} 个代码读取失败：${result.failed.join('、')}`)
        if (result.cachedCount) w.push(`其中 ${result.cachedCount} 只来自缓存`)
        warnings.value = w
      }
    } else {
      const { run, cached } = await stockSignalsApi.requestScan({
        date: queryDate.value,
        refresh,
      })
      if (seq !== requestSeq) return // 过期响应：丢弃
      if (cached) {
        await loadByDate(queryDate.value)
      } else if (run) {
        activeRun.value = { ...run }
        pollRun(run.id, seq)
      }
    }
  } catch (e) {
    if (seq !== requestSeq) return
    error.value =
      (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
      '扫描失败，请稍后重试'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

/** 历史日期切换 */
const selectDate = (date: string) => {
  if (date === queryDate.value && (items.value.length || notScanned.value)) return
  queryDate.value = date
  void loadByDate(date)
}

/** 日期变更：周末自动回溯到周五并提示（提示在加载完成后设置，避免被 resetResult 清掉） */
const onDateChange = async (date: string) => {
  if (isWeekend(date)) {
    const snapped = snapToTradingDay(date)
    queryDate.value = snapped
    await loadByDate(snapped)
    warnings.value = [`周末没有交易数据，已回溯到 ${snapped}`, ...warnings.value]
    return
  }
  selectDate(date)
}

// ---- 复制全部代码 ----
const copied = ref(false)
const copyAll = async () => {
  if (!items.value.length) return
  const text = items.value.map((i) => i.code).join(',')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    warnings.value = [...warnings.value, '复制失败，请手动选择表格内容复制']
  }
}

// ---- 初始化：历史日期 + 当日缓存 ----
void loadDates()
void loadByDate(queryDate.value)

onBeforeUnmount(clearPoll)
</script>

<template>
  <div class="min-h-screen">
    <Navbar />

    <main class="max-w-[940px] mx-auto px-6 py-10">
      <!-- 页头（投资板块用领域点缀色） -->
      <div class="mb-7">
        <p
          class="eyebrow"
          style="color: var(--domain)"
        >
          Sina UPBS / Daily Signal
        </p>
        <h1 class="font-display text-[clamp(1.7rem,3.2vw,2.3rem)] font-bold tracking-[-0.02em] leading-[1.2] mb-2">
          今日 B 信号筛选
        </h1>
        <p class="text-muted max-w-[60ch]">
          扫描沪深主板非 ST 股票的新浪多空信号，当日值为 1 即标为 B。勾选入池后每日自动盯 S，出 S 标红提醒。
        </p>
      </div>

      <!-- 查询面板 -->
      <section class="od-card p-6 mb-7">
        <div class="flex flex-wrap items-end gap-5">
          <div>
            <label
              class="od-label"
              for="query-date"
            >查询日期</label>
            <input
              id="query-date"
              v-model="queryDate"
              type="date"
              class="od-input !w-44"
              :max="today"
              :disabled="scanning"
              @change="onDateChange(queryDate)"
            >
          </div>

          <label class="flex items-start gap-2.5 cursor-pointer select-none pb-2">
            <input
              type="checkbox"
              class="mt-0.5 accent-[var(--accent)]"
              :checked="mode === 'full'"
              :disabled="scanning"
              @change="mode = ($event.target as HTMLInputElement).checked ? 'full' : 'codes'"
            >
            <span>
              <span class="block text-fg text-sm font-medium">扫描全部沪深主板非 ST</span>
              <span class="block text-muted text-xs mt-0.5">自动排除创业板、科创板和 ST 股（约 3044 只，需 1-2 分钟）</span>
            </span>
          </label>
        </div>

        <div
          v-if="mode === 'codes'"
          class="mt-4"
        >
          <label
            class="od-label"
            for="codes"
          >指定主板股票代码</label>
          <textarea
            id="codes"
            v-model="codesText"
            class="od-input resize-y min-h-[100px] font-mono text-sm"
            spellcheck="false"
            placeholder="例如：002292, 600519, sz000001&#10;支持逗号、空格或换行分隔；可带 sh/sz 前缀"
            :disabled="scanning"
          />
          <p class="text-muted text-xs mt-1.5">
            6 开头自动识别为 sh，0/1/2/3 开头自动识别为 sz
          </p>
        </div>

        <div class="flex items-center flex-wrap gap-3.5 mt-5">
          <button
            class="od-btn od-btn-primary"
            :disabled="scanning || loading"
            @click="scan(false)"
          >
            <AppIcon
              name="search"
              :size="15"
            />
            {{ mode === 'full' ? '扫描沪深主板非 ST' : '筛选指定代码' }}
          </button>
          <button
            v-if="stats && !notScanned"
            class="od-btn od-btn-ghost"
            :disabled="scanning || loading"
            title="忽略缓存，重新抓取该日期数据"
            @click="scan(true)"
          >
            强制刷新
          </button>
          <span
            v-if="!auth.isAuthenticated"
            class="text-muted text-sm"
          >
            查询缓存无需登录，发起扫描需<router-link
              to="/login?redirect=/stock-signals"
              class="text-accent-strong hover:underline"
            >登录</router-link>
          </span>
        </div>
      </section>

      <!-- 扫描进度 -->
      <section
        v-if="activeRun"
        class="od-card p-6 mb-7"
      >
        <div class="flex items-center justify-between mb-3">
          <p class="text-fg font-medium text-sm">
            正在扫描 {{ queryDate }} 的全市场信号…
          </p>
          <p class="text-muted text-sm font-mono">
            {{ activeRun.checked }} / {{ activeRun.total || 3044 }}
          </p>
        </div>
        <div class="h-2 rounded-full bg-fg/8 overflow-hidden">
          <div
            class="h-full rounded-full bg-accent transition-[width] duration-500"
            :style="{ width: `${Math.round((activeRun.checked / (activeRun.total || 3044)) * 100)}%` }"
          />
        </div>
        <p class="text-muted text-xs mt-2.5">
          已发现 {{ activeRun.found }} 只 B · 服务端扫描中，离开本页不中断
        </p>
      </section>

      <!-- Tab 栏：B 信号筛选 / 我的观察池 -->
      <div class="flex gap-1 mb-5 border-b border-border">
        <button
          class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px cursor-pointer"
          :class="tab === 'scan' ? 'border-accent text-accent-strong' : 'border-transparent text-muted hover:text-fg'"
          @click="tab = 'scan'"
        >
          B 信号筛选
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px cursor-pointer"
          :class="tab === 'pool' ? 'border-accent text-accent-strong' : 'border-transparent text-muted hover:text-fg'"
          @click="tab = 'pool'"
        >
          我的观察池
          <span
            v-if="triggeredCount"
            class="min-w-5 h-5 px-1 rounded-full bg-danger text-white text-xs font-bold inline-flex items-center justify-center"
          >{{ triggeredCount }}</span>
        </button>
      </div>

      <!-- 出 S 横幅：挂在 B 筛选 Tab，点击跳观察池 -->
      <button
        v-if="tab === 'scan' && triggeredCount"
        class="w-full od-card p-3.5 mb-4 text-sm font-medium text-danger cursor-pointer text-left"
        @click="tab = 'pool'"
      >
        观察池有 {{ triggeredCount }} 只出 S，去查看 →
      </button>

      <!-- 观察池 Tab -->
      <WatchlistPanel v-if="tab === 'pool'" />

      <!-- B 信号筛选 Tab -->
      <template v-else>
        <!-- 结果区 -->
        <section class="mb-7">
          <div class="flex items-baseline justify-between gap-4 mb-3">
            <h2 class="font-display text-lg font-bold text-fg">
              筛选结果
            </h2>
            <div class="flex items-center gap-3">
              <button
                v-if="auth.isAuthenticated && items.length"
                class="od-btn od-btn-primary !py-1.5 !px-3 text-xs"
                :disabled="!checked.length || addMutation.isPending.value"
                @click="addMutation.mutate()"
              >
                {{ addMutation.isPending.value ? '入池中…' : `加入观察池${checked.length ? ` (${checked.length})` : ''}` }}
              </button>
              <button
                v-if="items.length"
                class="od-btn od-btn-ghost !py-1.5 !px-3 text-xs"
                @click="copyAll"
              >
                {{ copied ? `已复制 ${items.length} 只 ✓` : '复制全部代码' }}
              </button>
              <span class="text-muted text-sm">
                <template v-if="scanning">扫描中…</template>
                <template v-else-if="stats">
                  {{ queryDate }} B：{{ stats.found }} 只 / 已检查 {{ stats.checked }} 只
                </template>
                <template v-else-if="loading">读取中…</template>
                <template v-else>尚未查询</template>
              </span>
            </div>
          </div>

          <!-- 缓存标注 -->
          <p
            v-if="stats && !scanning"
            class="text-muted text-xs mb-3"
          >
            缓存于 {{ formatTime(stats.scannedAt) }}（非强制刷新不重抓）
          </p>

          <!-- 警告 -->
          <div
            v-if="warnings.length"
            class="od-card p-3.5 mb-3 text-muted text-sm flex flex-col gap-1"
          >
            <p
              v-for="(w, i) in warnings"
              :key="i"
            >
              {{ w }}
            </p>
          </div>

          <!-- 错误 -->
          <p
            v-if="error"
            class="od-error mb-3"
          >
            {{ error }}
          </p>

          <!-- 尚未扫描 -->
          <div
            v-if="notScanned && !scanning"
            class="od-card p-6 text-center"
          >
            <p class="text-fg font-medium mb-1.5">
              {{ queryDate }} 还没有扫描数据
            </p>
            <p class="text-muted text-sm mb-5">
              {{ auth.isAuthenticated ? '点击上方按钮发起扫描，结果会缓存并保留历史' : '登录后可发起扫描；已扫描的日期可直接查看' }}
            </p>
            <button
              v-if="auth.isAuthenticated"
              class="od-btn od-btn-primary mx-auto"
              :disabled="loading"
              @click="scan(false)"
            >
              立即扫描
            </button>
          </div>

          <!-- 结果表格 -->
          <div
            v-else-if="items.length"
            class="od-card overflow-x-auto p-0"
          >
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="border-b border-border">
                  <th
                    v-if="auth.isAuthenticated"
                    class="w-10 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      class="accent-[var(--accent)] cursor-pointer"
                      :checked="allChecked"
                      :disabled="!checkable.length"
                      title="全选未入池"
                      @change="toggleAll"
                    >
                  </th>
                  <th class="text-muted text-xs font-medium px-4 py-3">
                    股票代码
                  </th>
                  <th class="text-muted text-xs font-medium px-4 py-3">
                    股票名称
                  </th>
                  <th class="text-muted text-xs font-medium px-4 py-3">
                    信号日期
                  </th>
                  <th class="text-muted text-xs font-medium px-4 py-3">
                    信号
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item.code"
                  class="border-b border-border last:border-0"
                >
                  <td
                    v-if="auth.isAuthenticated"
                    class="px-4 py-3"
                  >
                    <input
                      v-if="!poolCodes.has(item.code)"
                      type="checkbox"
                      class="accent-[var(--accent)] cursor-pointer"
                      :checked="checked.includes(item.code)"
                      @change="toggleCheck(item.code)"
                    >
                    <span
                      v-else
                      class="text-muted text-xs"
                    >已在池</span>
                  </td>
                  <td class="px-4 py-3 font-mono text-sm text-fg">
                    {{ item.market.toUpperCase() }}{{ item.code }}
                  </td>
                  <td class="px-4 py-3 text-sm text-fg">
                    {{ item.name || '—' }}
                  </td>
                  <td class="px-4 py-3 font-mono text-sm text-muted">
                    {{ queryDate }}
                  </td>
                  <td class="px-4 py-3 text-sm font-bold text-success">
                    B (1)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 空结果 -->
          <div
            v-else-if="stats && !scanning"
            class="od-card p-6 text-center text-muted text-sm"
          >
            本次查询的股票中，{{ queryDate }} 没有出现 B（1）信号。
          </div>
        </section>

        <!-- 历史日期 -->
        <section v-if="dates.length">
          <h2 class="font-display text-lg font-bold text-fg mb-3">
            历史扫描
          </h2>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="d in dates"
              :key="d.date"
              class="od-chip cursor-pointer"
              :class="{ '!bg-accent !text-white': d.date === queryDate }"
              @click="selectDate(d.date)"
            >
              {{ d.date }} · B {{ d.found }}
            </button>
          </div>
        </section>
      </template>

      <footer class="mt-8 text-muted text-xs">
        股票清单与信号数据均来自新浪财经，结果由服务端缓存并按日保留。仅按信号值展示，不构成投资建议。
      </footer>
    </main>
  </div>
</template>
