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
  <div class="conversation-toolbar">
    <div class="conversation-heading">
      <span>对话记录</span><span class="conversation-count">{{ conversations.length }}</span>
    </div>
    <button
      class="conversation-new"
      @click="emit('newConversation')"
    >
      <AppIcon
        name="plus"
        :size="17"
      />新对话
    </button>
    <div
      v-if="conversations.length"
      class="conversation-search"
    >
      <AppIcon
        name="search"
        :size="15"
      />
      <input
        v-model="keyword"
        type="search"
        placeholder="搜索会话"
        aria-label="搜索会话"
      >
    </div>
  </div>

  <div
    class="conversation-items"
    aria-label="对话记录"
  >
    <div
      v-if="isDraft"
      class="conversation-row is-selected conversation-draft"
      aria-current="true"
    >
      <AppIcon
        name="message-square"
        :size="16"
      />
      <span>新对话<small>尚未发送</small></span>
    </div>
    <div
      v-if="isLoading"
      class="conversation-empty"
      role="status"
    >
      加载中...
    </div>
    <div
      v-else-if="keyword.trim() && !filtered.length"
      class="conversation-empty"
    >
      无匹配会话
    </div>
    <template v-else>
      <div
        v-for="conv in filtered"
        :key="conv.id"
        class="conversation-row"
        :class="{ 'is-selected': !isDraft && conv.id === selectedId }"
      >
        <button
          class="conversation-select"
          :aria-current="!isDraft && conv.id === selectedId ? 'true' : undefined"
          :title="conv.title || '未命名会话'"
          @click="emit('select', conv.id)"
        >
          <AppIcon
            name="message-square"
            :size="16"
          />
          <span>{{ conv.title || '未命名会话' }}</span>
        </button>
        <button
          class="conversation-delete"
          :aria-label="`删除会话：${conv.title || '未命名会话'}`"
          title="删除会话"
          @click="emit('remove', conv)"
        >
          <AppIcon
            name="trash-2"
            :size="14"
          />
        </button>
      </div>
      <button
        v-if="hasMore && !keyword.trim()"
        class="conversation-load-more"
        :disabled="isFetchingMore"
        @click="emit('loadMore')"
      >
        {{ isFetchingMore ? '加载中...' : '加载更多' }}
      </button>
    </template>
  </div>

  <div class="conversation-footer">
    <router-link to="/agents">
      <AppIcon
        name="settings"
        :size="16"
      />管理 Agent<AppIcon
        name="chevron-right"
        :size="14"
      />
    </router-link>
  </div>
</template>

<style scoped>
.conversation-toolbar { padding: 22px 16px 12px; flex-shrink: 0; }
.conversation-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; color: var(--fg); font-size: 13px; font-weight: 600; }
.conversation-count { color: var(--muted); font-size: 11px; font-weight: 400; }
.conversation-new { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 42px; border: 1px solid var(--border); border-radius: 10px; color: var(--fg); background: var(--bg); font-size: 13px; cursor: pointer; transition: background .15s ease, border-color .15s ease; }
.conversation-new:hover { background: var(--accent-soft); border-color: var(--accent); }
.conversation-search { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 8px 3px; color: var(--muted); border-bottom: 1px solid var(--border); }
.conversation-search input { width: 100%; min-width: 0; font-size: 12px; color: var(--fg); background: transparent; outline: none; }
.conversation-search:focus-within { border-color: var(--accent); }
.conversation-items { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 12px 16px; display: flex; flex-direction: column; gap: 6px; }
.conversation-row { display: flex; align-items: center; flex-shrink: 0; min-height: 46px; border: 1px solid transparent; border-radius: 10px; color: var(--muted); transition: background .15s ease, border-color .15s ease; }
.conversation-row:hover { background: var(--bg); color: var(--fg); }
.conversation-row.is-selected { background: color-mix(in srgb, var(--accent-soft) 45%, var(--surface)); border-color: color-mix(in srgb, var(--accent) 25%, var(--border)); color: var(--accent-strong); }
.conversation-select { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; padding: 12px 10px; font-size: 13px; text-align: left; cursor: pointer; border-radius: 9px; }
.conversation-select svg, .conversation-draft > svg { flex-shrink: 0; opacity: .8; }
.conversation-select span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conversation-delete { display: grid; place-items: center; width: 30px; height: 32px; flex-shrink: 0; margin-right: 4px; border-radius: 6px; color: var(--muted); opacity: 0; cursor: pointer; }
.conversation-row:hover .conversation-delete, .conversation-row:focus-within .conversation-delete { opacity: 1; }
.conversation-delete:hover { background: var(--surface); color: var(--danger); }
.conversation-draft { padding: 12px 10px; gap: 10px; font-size: 13px; }
.conversation-draft small { display: block; margin-top: 3px; color: var(--muted); font-size: 10px; }
.conversation-empty { padding: 28px 0; color: var(--muted); text-align: center; font-size: 12px; }
.conversation-load-more { padding: 10px; color: var(--muted); font-size: 12px; cursor: pointer; }
.conversation-load-more:disabled { opacity: .5; cursor: default; }
.conversation-footer { padding: 12px; border-top: 1px solid var(--border); flex-shrink: 0; }
.conversation-footer a { display: flex; align-items: center; gap: 9px; min-height: 42px; padding: 10px; color: var(--muted); font-size: 12px; border-radius: 8px; }
.conversation-footer a:hover { color: var(--fg); background: var(--bg); }
.conversation-footer svg:last-child { margin-left: auto; }
@media (hover: none) { .conversation-delete { opacity: 1; } }
</style>
