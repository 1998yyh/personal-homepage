<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../../../components/AppIcon.vue'

/**
 * 斜杠命令菜单（DSH 移植，极简版）：输入框以 `/` 开头且无空白时弹出，
 * 按前缀过滤；Enter 执行选中项，ArrowUp/Down 移动，Esc 关闭（页面层处理键盘）。
 */
export interface SlashCommand {
  name: string
  description: string
  icon: string
  /** 当前是否可用（如 /stop 仅流式中可用） */
  enabled: boolean
}

const props = defineProps<{
  commands: SlashCommand[]
  /** 输入框中的查询串（含开头 `/`） */
  query: string
  /** 当前高亮下标（页面层维护，键盘上下移动） */
  activeIndex: number
}>()

const emit = defineEmits<{
  select: [command: SlashCommand]
}>()

const filtered = computed(() => {
  const q = props.query.slice(1).toLowerCase()
  return props.commands.filter((c) => c.name.slice(1).startsWith(q))
})
</script>

<template>
  <div
    v-if="filtered.length"
    class="absolute bottom-full left-0 right-0 z-40 mb-2 od-card p-1.5 shadow-lift"
  >
    <button
      v-for="(cmd, i) in filtered"
      :key="cmd.name"
      class="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
      :class="[
        i === activeIndex ? 'bg-accent-soft' : 'hover:bg-fg/[0.04]',
        cmd.enabled ? '' : 'opacity-45',
      ]"
      @mousedown.prevent="emit('select', cmd)"
    >
      <AppIcon
        :name="cmd.icon"
        :size="13"
        class="text-muted shrink-0"
      />
      <span class="text-sm text-fg font-medium">{{ cmd.name }}</span>
      <span class="text-xs text-muted truncate">{{ cmd.description }}</span>
    </button>
  </div>
</template>
