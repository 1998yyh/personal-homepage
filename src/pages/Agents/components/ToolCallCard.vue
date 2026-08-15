<script setup lang="ts">
import { computed, ref } from 'vue'
import { BUILTIN_TOOL_LABELS, type BuiltinToolName } from '../../../types/agent'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  name: string
  args: Record<string, unknown>
  content?: string
  status: 'running' | 'done'
}>()

const expanded = ref(false)

const label = computed(() => BUILTIN_TOOL_LABELS[props.name as BuiltinToolName] ?? props.name)
const argsText = computed(() => JSON.stringify(props.args, null, 2))

// 工具图标（默认扳手；内置工具按语义区分）
const TOOL_ICONS: Record<BuiltinToolName, string> = {
  web_search: 'search',
  calculator: 'hash',
}
const icon = computed(() => TOOL_ICONS[props.name as BuiltinToolName] ?? 'wrench')

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

/** 折叠态参数摘要：k=v 单行截断 */
const argsSummary = computed(() => {
  const entries = Object.entries(props.args)
  if (!entries.length) return '无参数'
  return truncate(
    entries.map(([k, v]) => `${k}=${typeof v === 'string' ? `"${truncate(v, 24)}"` : JSON.stringify(v)}`).join('  '),
    96,
  )
})
</script>

<template>
  <div class="rounded-xl border border-border bg-fg/[0.03] text-xs overflow-hidden transition-colors">
    <!-- 头部：图标 + 工具名 + 状态徽章（DSH 式工具调用卡片） -->
    <button
      class="w-full px-3 py-2 flex items-center gap-2 hover:bg-fg/[0.04] transition-colors text-left"
      @click="expanded = !expanded"
    >
      <span
        class="w-6 h-6 rounded-md grid place-items-center shrink-0"
        :class="status === 'running' ? 'bg-accent-soft text-accent-strong' : 'bg-fg/5 text-muted'"
      >
        <AppIcon
          :name="icon"
          :size="13"
        />
      </span>
      <span class="text-fg font-medium">{{ label }}</span>
      <span
        v-if="status === 'running'"
        class="inline-flex items-center gap-1.5 text-accent-strong ml-1"
      >
        <span class="size-3 rounded-full border-[1.5px] border-current border-t-transparent animate-spin" />
        调用中
      </span>
      <span
        v-else
        class="inline-flex items-center gap-1 text-success ml-1"
      >
        <AppIcon
          name="check"
          :size="11"
        />
        完成
      </span>
      <AppIcon
        name="chevron-down"
        :size="14"
        class="ml-auto text-muted transition-transform"
        :class="{ 'rotate-180': expanded }"
      />
    </button>

    <!-- 折叠态：参数摘要单行（展开后才看格式化 JSON） -->
    <button
      v-if="!expanded"
      class="w-full px-3 pb-2 pt-0 flex items-center gap-1.5 text-muted hover:text-fg transition-colors font-mono text-[11px]"
      @click="expanded = true"
    >
      <span class="opacity-60 shrink-0">入参</span>
      <span class="truncate">{{ argsSummary }}</span>
    </button>

    <div
      v-if="expanded"
      class="px-3 pb-3 pt-2 border-t border-border flex flex-col gap-2"
    >
      <div>
        <div class="text-muted mb-1">
          入参
        </div>
        <pre class="font-mono text-fg/80 overflow-x-auto whitespace-pre-wrap break-all">{{ argsText }}</pre>
      </div>
      <div v-if="content != null">
        <div class="text-muted mb-1">
          结果
        </div>
        <pre class="font-mono text-fg/80 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{{ content }}</pre>
      </div>
    </div>
  </div>
</template>
