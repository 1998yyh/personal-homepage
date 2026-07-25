<script setup lang="ts">
import { computed, ref } from 'vue'

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
  <div class="rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs overflow-hidden">
    <button
      class="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/[0.04] transition-colors text-left"
      @click="expanded = !expanded"
    >
      <span>🔧</span>
      <span class="text-white/80">{{ label }}</span>
      <span
        v-if="status === 'running'"
        class="text-primary-300 animate-pulse"
      >调用中...</span>
      <span
        v-else
        class="text-white/30"
      >已完成</span>
      <span class="ml-auto text-white/30">{{ expanded ? '▾' : '▸' }}</span>
    </button>

    <div
      v-if="expanded"
      class="px-3 pb-3 space-y-2 border-t border-white/[0.06] pt-2"
    >
      <div>
        <div class="text-white/40 mb-1">
          入参
        </div>
        <pre class="text-white/70 overflow-x-auto whitespace-pre-wrap break-all">{{ argsText }}</pre>
      </div>
      <div v-if="content != null">
        <div class="text-white/40 mb-1">
          结果
        </div>
        <pre class="text-white/70 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{{ content }}</pre>
      </div>
    </div>
  </div>
</template>
