<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Conversation } from '../../../types/agent'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
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

// 会话搜索（纯前端过滤，XY·Agent 同款；量小不需要后端支持）
const keyword = ref('')
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return props.conversations
  return props.conversations.filter((c) => (c.title || '未命名会话').toLowerCase().includes(kw))
})
</script>

<template>
  <!-- 头部：新建对话 -->
  <div class="p-3 shrink-0 flex flex-col gap-2">
    <button
      class="od-btn od-btn-primary od-btn-block"
      @click="emit('newConversation')"
    >
      <AppIcon
        name="plus"
        :size="16"
      />
      新对话
    </button>

    <!-- 搜索会话 -->
    <div
      v-if="conversations.length"
      class="relative"
    >
      <AppIcon
        name="search"
        :size="14"
        class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none"
      />
      <input
        v-model="keyword"
        type="text"
        class="od-input !pl-8 !py-1.5 text-[13px]"
        placeholder="搜索会话..."
      >
    </div>
  </div>

  <!-- 会话列表 -->
  <div class="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1">
    <!-- 草稿态占位项 -->
    <div
      v-if="isDraft"
      class="relative flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-[13.5px] bg-accent-soft text-accent-strong
        before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-accent"
    >
      <AppIcon
        name="message-square"
        :size="14"
        class="shrink-0"
      />
      <span class="truncate">新对话（未发送）</span>
    </div>

    <div
      v-if="isLoading"
      class="text-muted text-sm text-center py-8"
    >
      加载中...
    </div>

    <div
      v-else-if="keyword.trim() && !filtered.length"
      class="text-muted text-sm text-center py-8"
    >
      无匹配会话
    </div>

    <template v-else>
      <div
        v-for="conv in filtered"
        :key="conv.id"
        class="group relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-[10px] text-[13.5px] cursor-pointer transition-colors"
        :class="conv.id === selectedId
          ? 'bg-accent-soft text-fg before:content-[\'\'] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-accent'
          : 'text-fg/75 hover:bg-fg/5'"
        @click="emit('select', conv.id)"
      >
        <span class="truncate">{{ conv.title || '未命名会话' }}</span>
        <button
          class="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all shrink-0"
          title="删除会话"
          @click.stop="emit('remove', conv)"
        >
          <AppIcon
            name="trash-2"
            :size="14"
          />
        </button>
      </div>

      <button
        v-if="hasMore && !keyword.trim()"
        class="w-full py-2 text-muted hover:text-fg text-xs transition-colors disabled:opacity-50"
        :disabled="isFetchingMore"
        @click="emit('loadMore')"
      >
        {{ isFetchingMore ? '加载中...' : '加载更多' }}
      </button>
    </template>
  </div>

  <!-- 底部：管理 Agent 入口 -->
  <div class="border-t border-border p-3 shrink-0">
    <router-link
      to="/agents"
      class="od-nav-link flex items-center gap-2"
    >
      <AppIcon
        name="settings"
        :size="15"
      />
      管理 Agent
    </router-link>
  </div>
</template>
