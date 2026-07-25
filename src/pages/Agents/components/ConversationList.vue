<script setup lang="ts">
import type { Conversation } from '../../../types/agent'

defineProps<{
  conversations: Conversation[]
  /** null 表示草稿态（新建未发送） */
  selectedId: string | null
  isDraft: boolean
  isLoading: boolean
  hasMore: boolean
  isFetchingMore: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  newConversation: []
  loadMore: []
  remove: [conversation: Conversation]
}>()
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
      <h3 class="text-white/50 text-xs font-medium uppercase tracking-wider">
        会话
      </h3>
      <button
        class="text-primary-300 hover:text-primary-200 text-xs transition-colors"
        @click="emit('newConversation')"
      >
        + 新建
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <!-- 草稿态占位项 -->
      <div
        v-if="isDraft"
        class="px-3 py-2.5 rounded-lg bg-primary-500/20 border border-primary-500/30 text-sm text-white/90"
      >
        ✏️ 新会话（未发送）
      </div>

      <div
        v-if="isLoading"
        class="text-white/40 text-sm text-center py-8"
      >
        加载中...
      </div>

      <template v-else>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          :class="[
            'group px-3 py-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between gap-2 transition-colors',
            conv.id === selectedId
              ? 'bg-primary-500/20 border border-primary-500/30 text-white'
              : 'text-white/70 hover:bg-white/[0.05] border border-transparent',
          ]"
          @click="emit('select', conv.id)"
        >
          <span class="truncate">{{ conv.title || '未命名会话' }}</span>
          <button
            class="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all shrink-0"
            title="删除会话"
            @click.stop="emit('remove', conv)"
          >
            🗑
          </button>
        </div>

        <button
          v-if="hasMore"
          class="w-full py-2 text-white/40 hover:text-white/70 text-xs transition-colors disabled:opacity-50"
          :disabled="isFetchingMore"
          @click="emit('loadMore')"
        >
          {{ isFetchingMore ? '加载中...' : '加载更多' }}
        </button>
      </template>
    </div>
  </div>
</template>
