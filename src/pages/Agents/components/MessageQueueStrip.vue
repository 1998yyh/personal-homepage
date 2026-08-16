<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'

/**
 * 排队消息条（DSH QueueDock 移植）：流式中继续发送的消息在此排队，
 * 流自然结束后按序自动续发（abort/error 不续发）。
 * 点 x 删除；点行文本回输入框并出队（廉价编辑）。
 * 队列仅 tab 本地（刷新即丢，刻意不做后端持久化）。
 */
defineProps<{
  messages: string[]
}>()

const emit = defineEmits<{
  remove: [index: number]
  edit: [index: number]
}>()
</script>

<template>
  <div
    v-if="messages.length"
    class="mb-2 rounded-xl border border-border bg-surface px-3 py-2 flex flex-col gap-1"
  >
    <div class="text-[11px] text-muted/70 flex items-center gap-1.5">
      <AppIcon
        name="clock"
        :size="11"
      />
      排队中（{{ messages.length }}）· 生成结束后自动发送
    </div>
    <div
      v-for="(msg, i) in messages"
      :key="i"
      class="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-fg/[0.04] transition-colors"
    >
      <button
        class="flex-1 min-w-0 text-left text-xs text-fg/80 truncate"
        title="点按回到输入框编辑"
        @click="emit('edit', i)"
      >
        {{ msg }}
      </button>
      <button
        class="w-5 h-5 rounded grid place-items-center text-muted/60 hover:text-danger transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="移出队列"
        @click="emit('remove', i)"
      >
        <AppIcon
          name="x"
          :size="12"
        />
      </button>
    </div>
  </div>
</template>
