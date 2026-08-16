<script setup lang="ts">
import { computed, ref } from 'vue'
import { BUILTIN_TOOL_LABELS, type BuiltinToolName } from '../../../types/agent'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  name: string
  args: Record<string, unknown>
  content?: string
  status: 'running' | 'done' | 'error' | 'interrupted'
}>()

const expanded = ref(false)

const label = computed(() => BUILTIN_TOOL_LABELS[props.name as BuiltinToolName] ?? props.name)
const argsText = computed(() => JSON.stringify(props.args, null, 2))

// 工具图标（默认扳手；内置工具按语义区分）
const TOOL_ICONS: Record<BuiltinToolName, string> = {
  web_search: 'search',
  calculator: 'hash',
  delegate_task: 'list-tree',
  run_background_task: 'clock',
}
const icon = computed(() => TOOL_ICONS[props.name as BuiltinToolName] ?? 'wrench')

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

/** 各工具的「代表参数」key（DSH SUMMARY_KEYS 移植）：折叠态只挑这个参数做摘要 */
const SUMMARY_KEYS: Record<string, string> = {
  web_search: 'query',
  calculator: 'expression',
  delegate_task: 'task',
  run_background_task: 'task',
}

/** 折叠态参数摘要：优先按 SUMMARY_KEYS 挑代表参数；MCP 工具取第一个字符串参数；回退 k=v 列表 */
const argsSummary = computed(() => {
  const entries = Object.entries(props.args)
  if (!entries.length) return '无参数'

  const preferredKey = SUMMARY_KEYS[props.name]
  const preferred = preferredKey ? props.args[preferredKey] : undefined
  if (typeof preferred === 'string' && preferred) {
    return truncate(preferred, 96)
  }

  // MCP/未登记工具：取第一个字符串参数值
  const firstString = entries.find(([, v]) => typeof v === 'string' && v)
  if (firstString) {
    return truncate(firstString[1] as string, 96)
  }

  return truncate(
    entries.map(([k, v]) => `${k}=${typeof v === 'string' ? `"${truncate(v, 24)}"` : JSON.stringify(v)}`).join('  '),
    96,
  )
})

/** error 态折叠时展示结果首行（错误信息本体），成功态不展示（结果进展开体） */
const errorFirstLine = computed(() => {
  if (props.status !== 'error' || !props.content) return ''
  return truncate(props.content.split('\n').find((l) => l.trim())?.trim() ?? '', 96)
})

/** 头部右侧状态徽章配置（running/done/error/interrupted 四态） */
const STATUS_META = {
  running: { text: '调用中', class: 'text-accent-strong' },
  done: { text: '完成', class: 'text-success' },
  error: { text: '失败', class: 'text-danger' },
  interrupted: { text: '已中断', class: 'text-warn' },
} as const
const statusMeta = computed(() => STATUS_META[props.status])
</script>

<template>
  <div
    class="rounded-xl border text-xs overflow-hidden transition-colors"
    :class="status === 'error' ? 'border-danger/40 bg-danger/[0.03]' : 'border-border bg-fg/[0.03]'"
  >
    <!-- 头部：图标 + 工具名 + 状态徽章（DSH 式工具调用卡片） -->
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
          :name="status === 'error' ? 'alert-circle' : icon"
          :size="13"
        />
      </span>
      <span class="text-fg font-medium">{{ label }}</span>
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

    <!-- 折叠态：参数摘要单行（展开后才看格式化 JSON）；error 态替换为首行错误 -->
    <button
      v-if="!expanded"
      class="w-full px-3 pb-2 pt-0 flex items-center gap-1.5 transition-colors font-mono text-[11px] text-left"
      :class="status === 'error' && errorFirstLine ? 'text-danger/90 hover:text-danger' : 'text-muted hover:text-fg'"
      @click="expanded = true"
    >
      <template v-if="status === 'error' && errorFirstLine">
        <span class="opacity-60 shrink-0">错误</span>
        <span class="truncate">{{ errorFirstLine }}</span>
      </template>
      <template v-else>
        <span class="opacity-60 shrink-0">入参</span>
        <span class="truncate">{{ argsSummary }}</span>
      </template>
    </button>

    <div
      v-if="expanded"
      class="px-3 pb-3 pt-2 border-t flex flex-col gap-2"
      :class="status === 'error' ? 'border-danger/30' : 'border-border'"
    >
      <div>
        <div class="text-muted mb-1">
          入参
        </div>
        <pre class="font-mono text-fg/80 overflow-x-auto whitespace-pre-wrap break-all">{{ argsText }}</pre>
      </div>
      <div v-if="content != null">
        <div
          class="mb-1"
          :class="status === 'error' ? 'text-danger' : 'text-muted'"
        >
          {{ status === 'error' ? '错误' : '结果' }}
        </div>
        <pre class="font-mono text-fg/80 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{{ content }}</pre>
      </div>
    </div>
  </div>
</template>
