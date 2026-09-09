<script setup lang="ts">
// 可复用词库：搜索 + 封面小卡 + 展开全文。只向外抛出选中的提示词文本，不绑生成台。
import { defineAsyncComponent, ref, useTemplateRef, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { promptsApi } from '../../../lib/prompts-api'
import ConfirmDeleteModal from '../../../components/ConfirmDeleteModal.vue'
import PromptLibraryFilters from './PromptLibraryFilters.vue'
import type { Prompt } from '../../../types/prompts'
import AppIcon from '../../../components/AppIcon.vue'
import PromptCover from './PromptCover.vue'
import { usePromptLibrary } from '../composables/usePromptLibrary'

const emit = defineEmits<{
  select: [text: string]
  close: []
}>()

const PromptEditorDialog = defineAsyncComponent(() => import('./PromptEditorDialog.vue'))

const {
  data,
  isPending,
  isFetching,
  isError,
  isPlaceholderData,
  refetch,
  keyword,
  category,
  debouncedKeyword,
  page,
  totalPages,
  resetFilters,
} = usePromptLibrary()

const editorOpen = ref(false)
const editing = ref<Prompt | null>(null)
const deleting = ref<Prompt | null>(null)
const deletePending = ref(false)
const deleteError = ref(false)
const queryClient = useQueryClient()

function editPrompt(prompt: Prompt | null) {
  editing.value = prompt
  editorOpen.value = true
}

async function removePrompt() {
  if (!deleting.value || deletePending.value) return
  deletePending.value = true
  deleteError.value = false
  try {
    await promptsApi.remove(deleting.value.id)
    deleting.value = null
    await queryClient.invalidateQueries({ queryKey: ['prompts'] })
  } catch { deleteError.value = true }
  finally { deletePending.value = false }
}
const expandedId = ref<string | null>(null)
const listEl = useTemplateRef<HTMLElement>('list')

watch([page, debouncedKeyword, category], () => {
  expandedId.value = null
  listEl.value?.scrollTo({ top: 0 })
})

function cardKey(prompt: Prompt) {
  return `${prompt.sourceId}:${prompt.id}`
}

function selectPrompt(prompt: Prompt) {
  emit('select', prompt.prompt)
}

function toggleExpand(prompt: Prompt) {
  const key = cardKey(prompt)
  expandedId.value = expandedId.value === key ? null : key
}

</script>

<template>
  <div class="library">
    <header class="library-header">
      <h2>词库</h2>
      <div class="library-actions">
        <button
          v-if="data?.canManage"
          type="button"
          class="od-icon-btn"
          aria-label="新增提示词"
          @click="editPrompt(null)"
        >
          <AppIcon
            name="plus"
            :size="15"
          />
        </button>
        <button
          type="button"
          class="od-icon-btn"
          aria-label="关闭词库"
          @click="emit('close')"
        >
          <AppIcon
            name="x"
            :size="15"
          />
        </button>
      </div>
    </header>

    <label class="search-field">
      <AppIcon
        name="search"
        :size="15"
      />
      <input
        v-model="keyword"
        type="search"
        aria-label="搜索提示词"
        placeholder="搜索提示词…"
      >
    </label>

    <PromptLibraryFilters
      v-model:category="category"
      :categories="data?.categories ?? []"
      :total="data?.total ?? 0"
    />
    <div
      ref="list"
      class="library-list"
    >
      <p
        v-if="isFetching && !isPending"
        class="library-status"
        role="status"
      >
        正在更新…
      </p>
      <div
        v-if="isError"
        class="library-error"
        role="alert"
      >
        <span>提示词加载失败</span>
        <button
          type="button"
          class="od-btn od-btn-ghost"
          :disabled="isFetching"
          @click="refetch()"
        >
          重试
        </button>
      </div>
      <div
        v-else-if="isPending"
        class="card-stack"
        aria-label="正在加载提示词"
        aria-busy="true"
      >
        <div
          v-for="n in 9"
          :key="n"
          class="skeleton"
        />
      </div>
      <div
        v-else-if="!data?.items.length"
        class="library-empty"
      >
        <p>{{ (keyword || category !== 'all') ? '没有找到这个灵感' : '还没有提示词' }}</p>
        <p>
          {{
            (keyword || category !== 'all')
              ? '换个关键词或分类试试。'
              : '内部词库暂无内容。'
          }}
        </p>
        <button
          v-if="keyword || category !== 'all'"
          type="button"
          class="od-btn od-btn-ghost"
          @click="resetFilters()"
        >
          清空筛选
        </button>
        <button
          v-else-if="data?.canManage"
          type="button"
          class="od-btn od-btn-ghost"
          @click="editPrompt(null)"
        >
          新增提示词
        </button>
      </div>
      <div
        v-else
        class="card-stack"
        :aria-busy="isFetching"
      >
        <article
          v-for="(prompt, index) in data.items"
          :key="cardKey(prompt)"
          class="prompt-card"
          :data-expanded="expandedId === cardKey(prompt) ? '' : undefined"
        >
          <button
            type="button"
            class="card-hit"
            :aria-label="`填入「${prompt.title}」`"
            @click="selectPrompt(prompt)"
          >
            <PromptCover
              :src="prompt.coverUrl"
              :title="prompt.title"
              :priority="index === 0"
            />
          </button>
          <div class="card-bar">
            <button
              type="button"
              class="card-title"
              :aria-label="`填入「${prompt.title}」`"
              @click="selectPrompt(prompt)"
            >
              {{ prompt.title }}
            </button>
            <button
              type="button"
              class="expand-btn"
              :aria-expanded="expandedId === cardKey(prompt)"
              :aria-label="
                expandedId === cardKey(prompt) ? '收起提示词' : '查看完整提示词'
              "
              @click="toggleExpand(prompt)"
            >
              <AppIcon
                name="chevron-down"
                :size="14"
              />
            </button>
          </div>
          <div
            v-if="expandedId === cardKey(prompt)"
            class="card-expand"
          >
            <p
              v-if="prompt.description"
              class="card-desc"
            >
              {{ prompt.description }}
            </p>
            <div class="flex flex-wrap gap-1 text-xs text-muted">
              <span>{{ prompt.category }}</span><span
                v-for="item in prompt.tags.slice(0, 5)"
                :key="item"
              > · {{ item }}</span>
            </div>
            <p class="text-xs text-muted">
              来源：{{ prompt.sourceName }}<span v-if="prompt.author"> · {{ prompt.author }}</span>
            </p>
            <div
              v-if="prompt.canEdit"
              class="flex gap-2"
            >
              <button
                type="button"
                class="od-btn od-btn-ghost"
                @click="editPrompt(prompt)"
              >
                编辑
              </button>
              <button
                type="button"
                class="od-btn od-btn-ghost text-danger"
                @click="deleting = prompt; deleteError = false"
              >
                删除
              </button>
            </div>
            <pre class="card-prompt">{{ prompt.prompt }}</pre>
            <button
              type="button"
              class="od-btn od-btn-primary"
              @click="selectPrompt(prompt)"
            >
              填入输入框
            </button>
          </div>
        </article>
      </div>
    </div>

    <footer
      v-if="data && totalPages > 1"
      class="library-footer"
    >
      <button
        type="button"
        class="od-btn od-btn-ghost"
        :disabled="page <= 1 || isPlaceholderData"
        @click="page -= 1"
      >
        上一页
      </button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button
        type="button"
        class="od-btn od-btn-ghost"
        :disabled="page >= totalPages || isPlaceholderData"
        @click="page += 1"
      >
        下一页
      </button>
    </footer>

    <PromptEditorDialog
      v-if="editorOpen"
      :prompt="editing"
      :categories="data?.categories ?? []"
      @close="editorOpen = false"
      @saved="editorOpen = false"
    />
    <Teleport to="body">
      <ConfirmDeleteModal
        v-if="deleting"
        title="删除提示词"
        :message="`确定删除「${deleting.title}」吗？删除后不再显示，重新导入也不会恢复。`"
        :deleting="deletePending"
        :error="deleteError"
        @cancel="() => { if (!deletePending) deleting = null }"
        @confirm="removePrompt"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.library {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  min-height: 0;
  height: 100%;
  flex: 1;
  container-type: inline-size;
  background: var(--bg);
  color: var(--fg);
}
.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 8px;
}
.library-header h2 {
  font-size: 13px;
  font-weight: 600;
}
.library-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 10px;
  padding: 0 10px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--muted);
}
.search-field:focus-within {
  border-color: var(--accent);
}
.search-field input {
  width: 100%;
  min-width: 0;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: var(--fg);
}
.library-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 12px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklch, var(--fg) 22%, transparent) transparent;
}
.library-status,
.library-error,
.library-empty {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  padding: 16px 8px;
}
.library-error {
  color: var(--danger);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.library-empty p + p {
  margin-top: 6px;
}
.library-empty .od-btn {
  margin-top: 12px;
}
.card-stack {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-items: start;
}
@container (max-width: 22rem) {
  .card-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.prompt-card {
  position: relative;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface);
}
.prompt-card:hover,
.prompt-card:focus-within {
  border-color: var(--accent);
}
.prompt-card[data-expanded] {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: start;
}
.card-hit {
  display: block;
  width: 100%;
  padding: 0;
  text-align: left;
  cursor: pointer;
}
.prompt-card[data-expanded] .card-hit {
  grid-column: 1;
  grid-row: 1 / span 2;
  align-self: stretch;
}
.prompt-card[data-expanded] :deep(.prompt-cover) {
  height: 100%;
  min-height: 7.5rem;
  aspect-ratio: auto;
}
.card-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 2px 4px 6px;
}
.prompt-card[data-expanded] .card-bar {
  grid-column: 2;
  grid-row: 1;
  padding: 6px 6px 0 10px;
}
.card-title {
  min-width: 0;
  flex: 1;
  padding: 4px 0;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.expand-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
}
.expand-btn:hover {
  color: var(--fg);
}
.prompt-card[data-expanded] .expand-btn {
  color: var(--fg);
  transform: rotate(180deg);
}
.card-expand {
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.prompt-card[data-expanded] .card-expand {
  grid-column: 2;
  grid-row: 2;
}
.card-desc {
  font-size: 11px;
  color: var(--muted);
}
.card-prompt {
  margin: 0;
  max-height: 160px;
  overflow: auto;
  padding: 8px;
  border-radius: 8px;
  background: var(--bg);
  font-family: inherit;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.library-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--muted);
}
.skeleton {
  aspect-ratio: 4 / 3;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: linear-gradient(
    110deg,
    var(--surface) 25%,
    var(--border) 50%,
    var(--surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
  .prompt-card[data-expanded] .expand-btn {
    transition: none;
  }
}
</style>
