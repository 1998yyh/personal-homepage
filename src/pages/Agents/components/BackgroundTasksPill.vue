<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import agentsApi from '../../../lib/agents-api'
import type { BackgroundTask } from '../../../types/agent'
import AppIcon from '../../../components/AppIcon.vue'

/**
 * 后台任务 pill（DSH JobListAction 移植）：
 * - 会话有后台任务时才渲染；running>0 时呼吸圆点 + 计数
 * - 有 live（pending/running）任务时 5s 轮询，否则停轮询
 * - running→done/failed 跃迁时 invalidate 消息/会话列表（完成消息走普通历史到达）
 * - 弹层：live 在前按发起序，settled 按完成倒序；弹层开着且有 live 行才 1s 计时跳动
 */
const props = defineProps<{
  conversationId: string | null
  agentId: string
}>()

const queryClient = useQueryClient()

const { data: tasks } = useQuery({
  queryKey: computed(() => ['background-tasks', props.conversationId]),
  queryFn: () => agentsApi.listBackgroundTasks(props.conversationId!),
  enabled: computed(() => !!props.conversationId),
  // 仅在有 live 任务时轮询（函数形式：每次 refetch 前求值）
  refetchInterval: (query) => {
    const list = query.state.data
    return list?.some((t) => t.status === 'pending' || t.status === 'running') ? 5000 : false
  },
})

const list = computed(() => tasks.value ?? [])
const liveCount = computed(
  () => list.value.filter((t) => t.status === 'pending' || t.status === 'running').length,
)

// running/pending → done/failed 跃迁：完成后端会把 assistant 结果消息写回原会话，拉新历史
const prevStatuses = new Map<string, BackgroundTask['status']>()
watch(list, (next) => {
  let settled = false
  for (const t of next) {
    const prev = prevStatuses.get(t.id)
    if ((prev === 'pending' || prev === 'running') && (t.status === 'done' || t.status === 'failed')) {
      settled = true
    }
    prevStatuses.set(t.id, t.status)
  }
  if (settled && props.conversationId) {
    queryClient.invalidateQueries({ queryKey: ['messages', props.conversationId] })
    queryClient.invalidateQueries({ queryKey: ['conversations', props.agentId] })
  }
})

// ---- 弹层 ----
const open = ref(false)

/** live 在前（按发起先后），settled 在后（按完成时间倒序） */
const sorted = computed(() => {
  const live = list.value
    .filter((t) => t.status === 'pending' || t.status === 'running')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const settled = list.value
    .filter((t) => t.status === 'done' || t.status === 'failed')
    .sort((a, b) => (b.finishedAt ?? b.updatedAt).localeCompare(a.finishedAt ?? a.updatedAt))
  return [...live, ...settled]
})

// 弹层开着且有 live 行：1s 计时跳动（running 行显示已运行时长）
const nowMs = ref(0)
let tickTimer: ReturnType<typeof setInterval> | null = null
watch([open, liveCount], ([isOpen, live]) => {
  if (isOpen && live > 0) {
    nowMs.value = Date.now()
    tickTimer = setInterval(() => {
      nowMs.value = Date.now()
    }, 1000)
  } else if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
})
onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer)
})

/** running 行已运行时长（updatedAt 近似认领时刻，m:ss） */
const elapsedOf = (t: BackgroundTask) => {
  if (t.status !== 'running' || !nowMs.value) return ''
  const secs = Math.max(0, Math.floor((nowMs.value - new Date(t.updatedAt).getTime()) / 1000))
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

const STATUS_META: Record<BackgroundTask['status'], { text: string; dot: string; cls: string }> = {
  pending: { text: '排队中', dot: 'bg-muted', cls: 'text-muted' },
  running: { text: '运行中', dot: 'bg-accent', cls: 'text-accent-strong' },
  done: { text: '已完成', dot: 'bg-success', cls: 'text-success' },
  failed: { text: '失败', dot: 'bg-danger', cls: 'text-danger' },
}
</script>

<template>
  <!-- 无任务不渲染 -->
  <div
    v-if="list.length"
    class="relative shrink-0"
  >
    <button
      class="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-fg transition-colors"
      :class="open ? 'border-accent-strong text-fg' : ''"
      title="后台任务"
      @click="open = !open"
    >
      <span
        v-if="liveCount > 0"
        class="size-1.5 rounded-full bg-accent od-breathe"
      />
      <AppIcon
        v-else
        name="clock"
        :size="12"
      />
      <template v-if="liveCount > 0">
        后台任务 {{ liveCount }}
      </template>
      <template v-else>
        后台任务
      </template>
    </button>

    <!-- 弹层（点遮罩关闭） -->
    <template v-if="open">
      <div
        class="fixed inset-0 z-30"
        @click="open = false"
      />
      <div class="absolute right-0 top-full z-40 mt-2 w-80 od-card p-2 shadow-lift">
        <div class="px-2 py-1.5 text-xs font-medium text-muted">
          后台任务（{{ list.length }}）
        </div>
        <div class="max-h-72 overflow-y-auto flex flex-col gap-0.5">
          <div
            v-for="t in sorted"
            :key="t.id"
            class="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-fg/[0.04] transition-colors"
          >
            <span
              class="mt-1.5 size-1.5 rounded-full shrink-0"
              :class="[STATUS_META[t.status].dot, t.status === 'running' ? 'od-breathe' : '']"
            />
            <div class="min-w-0 flex-1">
              <div class="text-xs text-fg truncate">
                {{ t.input }}
              </div>
              <div
                class="text-[11px] tabular-nums"
                :class="STATUS_META[t.status].cls"
              >
                {{ STATUS_META[t.status].text }}
                <span v-if="elapsedOf(t)"> · {{ elapsedOf(t) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
