<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  name: string
  args: Record<string, unknown>
  content?: string
  status: 'running' | 'done'
}>()

const expanded = ref(false)

const TOOL_LABELS: Record<string, string> = {
  web_search: '联网搜索',
  calculator: '计算器',
}

const label = computed(() => TOOL_LABELS[props.name] ?? props.name)
const argsText = computed(() => JSON.stringify(props.args, null, 2))
</script>

<template>
  <div class="rounded-xl border border-border bg-fg/[0.03] text-xs overflow-hidden">
    <button
      class="w-full px-3 py-2 flex items-center gap-2 hover:bg-fg/[0.04] transition-colors text-left"
      @click="expanded = !expanded"
    >
      <AppIcon
        name="wrench"
        :size="13"
        class="text-muted shrink-0"
      />
      <span class="text-fg font-medium">{{ label }}</span>
      <span
        v-if="status === 'running'"
        class="text-accent-strong animate-pulse"
      >调用中...</span>
      <span
        v-else
        class="text-muted"
      >已完成</span>
      <AppIcon
        name="chevron-down"
        :size="14"
        class="ml-auto text-muted transition-transform"
        :class="{ 'rotate-180': expanded }"
      />
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
