<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SubTrace } from '../../../composables/useAgentStream'
import AppIcon from '../../../components/AppIcon.vue'
import ReasoningRow from './ReasoningRow.vue'
import ToolCallCard from './ToolCallCard.vue'

/**
 * delegate_task 子代理卡片（DSH TaskToolCard 移植，一层嵌套）：
 * - 头部同 ToolCallCard（图标 list-tree，摘要取 args.task）
 * - 展开体递归复用 ReasoningRow（子代理思考）+ ToolCallCard（子代理工具）+ 最终文本（默认折叠）
 * - running 时默认展开（看实时轨迹），settle 后自动折叠
 * - 子轨迹是 live-only（SSE 旁路不落库）：刷新后无 subTrace，直接退化为普通 ToolCallCard
 */
const props = defineProps<{
  name: string
  args: Record<string, unknown>
  content?: string
  status: 'running' | 'done' | 'error' | 'interrupted'
  subTrace?: SubTrace
}>()

// running 默认展开看实时轨迹；settle 自动折叠让位于结果
const expanded = ref(props.status === 'running')
watch(
  () => props.status,
  (s) => {
    if (s !== 'running') expanded.value = false
  },
)

const taskSummary = computed(() => {
  const task = props.args.task
  const text = typeof task === 'string' && task ? task : JSON.stringify(props.args)
  return text.length > 96 ? `${text.slice(0, 96)}…` : text
})

// 子代理最终结论文本：默认折叠（settle 后正文气泡里已有父 Agent 的转述/引用）
const textExpanded = ref(false)

const STATUS_META = {
  running: { text: '委派中', class: 'text-accent-strong' },
  done: { text: '完成', class: 'text-success' },
  error: { text: '失败', class: 'text-danger' },
  interrupted: { text: '已中断', class: 'text-warn' },
} as const
const statusMeta = computed(() => STATUS_META[props.status])
</script>

<template>
  <!-- 无实时轨迹（历史回放）：退化为普通工具卡片 -->
  <ToolCallCard
    v-if="!subTrace"
    :name="name"
    :args="args"
    :content="content"
    :status="status"
  />

  <div
    v-else
    class="rounded-xl border text-xs overflow-hidden transition-colors"
    :class="status === 'error' ? 'border-danger/40 bg-danger/[0.03]' : 'border-accent/25 bg-accent/[0.03]'"
  >
    <!-- 头部 -->
    <button
      class="w-full px-3 py-2 flex items-center gap-2 hover:bg-fg/[0.04] transition-colors text-left"
      @click="expanded = !expanded"
    >
      <span
        class="w-6 h-6 rounded-md grid place-items-center shrink-0"
        :class="status === 'running' ? 'bg-accent-soft text-accent-strong'
          : status === 'error' ? 'bg-danger/10 text-danger'
            : 'bg-fg/5 text-muted'"
      >
        <AppIcon
          :name="status === 'error' ? 'alert-circle' : 'list-tree'"
          :size="13"
        />
      </span>
      <span class="text-fg font-medium">子代理</span>
      <span
        class="inline-flex items-center gap-1.5 ml-1"
        :class="statusMeta.class"
      >
        <AppIcon
          v-if="status === 'running'"
          name="loader-circle"
          :size="12"
          class="od-spin"
        />
        <AppIcon
          v-else-if="status === 'done'"
          name="check"
          :size="11"
        />
        <AppIcon
          v-else-if="status === 'error'"
          name="alert-circle"
          :size="11"
        />
        <AppIcon
          v-else
          name="x"
          :size="11"
        />
        {{ statusMeta.text }}
      </span>
      <AppIcon
        name="chevron-down"
        :size="14"
        class="ml-auto text-muted transition-transform"
        :class="{ 'rotate-180': expanded }"
      />
    </button>

    <!-- 折叠态：任务摘要 -->
    <button
      v-if="!expanded"
      class="w-full px-3 pb-2 pt-0 flex items-center gap-1.5 text-muted hover:text-fg transition-colors font-mono text-[11px] text-left"
      @click="expanded = true"
    >
      <span class="opacity-60 shrink-0">任务</span>
      <span class="truncate">{{ taskSummary }}</span>
    </button>

    <!-- 展开体：子代理实时轨迹（思考 → 工具 → 结论） -->
    <div
      v-if="expanded"
      class="px-3 pb-3 pt-2 border-t flex flex-col gap-2"
      :class="status === 'error' ? 'border-danger/30' : 'border-accent/20'"
    >
      <div class="font-mono text-muted/80 break-all">
        <span class="opacity-60">任务</span> {{ args.task }}
      </div>

      <ReasoningRow
        v-if="subTrace.reasoning"
        :text="subTrace.reasoning"
        :streaming="status === 'running'"
      />

      <ToolCallCard
        v-for="call in subTrace.toolCalls"
        :key="call.id"
        :name="call.name"
        :args="call.args"
        :content="call.content"
        :status="call.status"
      />

      <!-- 子代理最终结论文本（纯文本展示，默认折叠） -->
      <div
        v-if="subTrace.text"
        class="rounded-lg border border-border bg-fg/[0.02]"
      >
        <button
          class="w-full px-3 py-1.5 flex items-center gap-2 text-muted hover:text-fg transition-colors text-left"
          @click="textExpanded = !textExpanded"
        >
          <AppIcon
            name="message-square"
            :size="11"
            class="shrink-0"
          />
          <span>子代理结论</span>
          <AppIcon
            name="chevron-down"
            :size="12"
            class="ml-auto transition-transform"
            :class="textExpanded ? 'rotate-180' : ''"
          />
        </button>
        <div
          v-if="textExpanded"
          class="px-3 pb-2 text-fg/80 whitespace-pre-wrap break-words leading-relaxed max-h-[240px] overflow-y-auto"
          v-text="subTrace.text"
        />
      </div>
    </div>
  </div>
</template>
