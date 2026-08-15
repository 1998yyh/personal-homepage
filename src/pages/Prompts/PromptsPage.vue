<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { promptsApi } from '../../lib/prompts-api'
import type { Prompt, PromptSourceView } from '../../types/prompts'
import { ALL_PROMPTS_OPTION } from '../../types/prompts'
import { useAuthStore } from '../../stores/auth'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal.vue'

const router = useRouter()
const auth = useAuthStore()
const queryClient = useQueryClient()

const PAGE_SIZE = 24

// ---- 过滤态 ----
const keyword = ref('')
const debouncedKeyword = ref('')
const category = ref(ALL_PROMPTS_OPTION)
const activeTags = ref<string[]>([])
const page = ref(1)

// 搜索防抖：连续输入不每键发请求，停止 300ms 后才进 queryKey
let keywordTimer: ReturnType<typeof setTimeout> | null = null
watch(keyword, (value) => {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    debouncedKeyword.value = value
    page.value = 1
  }, 300)
})

onBeforeUnmount(() => {
  if (keywordTimer) clearTimeout(keywordTimer)
})

const { data: promptData, isLoading } = useQuery({
  queryKey: ['prompts', debouncedKeyword, category, activeTags, page],
  queryFn: () =>
    promptsApi.fetchPrompts({
      keyword: debouncedKeyword.value || undefined,
      category: category.value,
      tag: activeTags.value.join(',') || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    }),
  enabled: computed(() => auth.isAuthenticated),
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil((promptData.value?.total ?? 0) / PAGE_SIZE)),
)

const resetPage = () => {
  page.value = 1
}

const toggleTag = (tag: string) => {
  const idx = activeTags.value.indexOf(tag)
  if (idx >= 0) activeTags.value.splice(idx, 1)
  else activeTags.value.push(tag)
  resetPage()
}

// ---- 源管理 ----
const { data: sources } = useQuery({
  queryKey: ['prompt-sources'],
  queryFn: () => promptsApi.listSources(),
  enabled: computed(() => auth.isAuthenticated),
})

const { data: statuses } = useQuery({
  queryKey: ['prompt-source-statuses'],
  queryFn: () => promptsApi.fetchSourceStatuses(),
  enabled: computed(() => auth.isAuthenticated),
})

const toggleSourceMutation = useMutation({
  mutationFn: (source: PromptSourceView) =>
    promptsApi.updateSource(source.id, { isActive: !source.isActive }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['prompt-sources'] })
    queryClient.invalidateQueries({ queryKey: ['prompts'] })
  },
})

const refreshingId = ref<string | null>(null)
const refreshSourceMutation = useMutation({
  mutationFn: (id: string) => promptsApi.refreshSource(id),
  onSettled: () => {
    refreshingId.value = null
    queryClient.invalidateQueries({ queryKey: ['prompts'] })
    queryClient.invalidateQueries({ queryKey: ['prompt-source-statuses'] })
  },
})

const refreshAllMutation = useMutation({
  mutationFn: () => promptsApi.refreshAllSources(),
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['prompts'] })
    queryClient.invalidateQueries({ queryKey: ['prompt-source-statuses'] })
  },
})

// ---- 新建源（内联小表单） ----
const showSourceForm = ref(false)
const sourceForm = reactive({ name: '', url: '', homepage: '' })
const sourceFormError = ref<string | null>(null)

const createSourceMutation = useMutation({
  mutationFn: () =>
    promptsApi.createSource({
      name: sourceForm.name.trim(),
      url: sourceForm.url.trim(),
      homepage: sourceForm.homepage.trim() || undefined,
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['prompt-sources'] })
    showSourceForm.value = false
    sourceForm.name = ''
    sourceForm.url = ''
    sourceForm.homepage = ''
    sourceFormError.value = null
  },
  onError: (e) => {
    sourceFormError.value =
      (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
      '创建失败，请检查地址格式'
  },
})

const submitSourceForm = () => {
  sourceFormError.value = null
  if (!sourceForm.name.trim()) {
    sourceFormError.value = '请填写源名称'
    return
  }
  if (!sourceForm.url.trim()) {
    sourceFormError.value = '请填写源地址'
    return
  }
  createSourceMutation.mutate()
}

// ---- 删除源 ----
const deletingSource = ref<PromptSourceView | null>(null)
const deleteSourceMutation = useMutation({
  mutationFn: (id: string) => promptsApi.removeSource(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['prompt-sources'] })
    queryClient.invalidateQueries({ queryKey: ['prompts'] })
    deletingSource.value = null
  },
})

// ---- 提示词详情 ----
const viewingPrompt = ref<Prompt | null>(null)
const copied = ref(false)

const copyPrompt = async (prompt: Prompt) => {
  try {
    await navigator.clipboard.writeText(prompt.prompt)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="min-h-screen">
    <Navbar />

    <main class="max-w-[1280px] mx-auto px-6 py-10">
      <div class="flex items-end justify-between gap-4 flex-wrap mb-7">
        <div>
          <div class="eyebrow">
            Prompts
          </div>
          <h1 class="font-display text-2xl font-bold tracking-[-0.01em] text-fg">
            提示词库
          </h1>
          <p class="text-muted text-sm mt-1.5">
            聚合开源图像提示词源，一键复制到画布生成
          </p>
        </div>
        <button
          v-if="auth.isAuthenticated"
          class="od-btn od-btn-ghost"
          :disabled="refreshAllMutation.isPending.value"
          @click="refreshAllMutation.mutate()"
        >
          <AppIcon
            name="refresh-cw"
            :size="15"
          />
          {{ refreshAllMutation.isPending.value ? '刷新中...' : '刷新全部源' }}
        </button>
      </div>

      <EmptyState
        v-if="!auth.isAuthenticated"
        icon="type"
        title="登录后浏览提示词库"
        description="提示词来自可配置的远程源，登录即可浏览、搜索与复制"
        action-text="去登录"
        @action="router.push({ path: '/login', query: { redirect: '/prompts' } })"
      />

      <div
        v-else
        class="grid grid-cols-[260px_1fr] gap-6 max-lg:grid-cols-1"
      >
        <!-- 左栏：源管理 -->
        <aside class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h2 class="text-fg font-semibold text-sm">
              提示词源
            </h2>
            <button
              class="od-icon-btn !w-8 !h-8"
              title="添加自建源"
              @click="showSourceForm = !showSourceForm"
            >
              <AppIcon
                name="plus"
                :size="15"
              />
            </button>
          </div>

          <!-- 新建源表单 -->
          <div
            v-if="showSourceForm"
            class="od-card p-4 flex flex-col gap-2.5"
          >
            <input
              v-model="sourceForm.name"
              class="od-input"
              placeholder="源名称"
              autocomplete="off"
            >
            <input
              v-model="sourceForm.url"
              class="od-input"
              placeholder="源 JSON 地址（https://...）"
              autocomplete="off"
            >
            <input
              v-model="sourceForm.homepage"
              class="od-input"
              placeholder="主页（可选）"
              autocomplete="off"
            >
            <p
              v-if="sourceFormError"
              class="od-error"
            >
              {{ sourceFormError }}
            </p>
            <button
              class="od-btn od-btn-primary"
              :disabled="createSourceMutation.isPending.value"
              @click="submitSourceForm"
            >
              {{ createSourceMutation.isPending.value ? '创建中...' : '创建' }}
            </button>
          </div>

          <div
            v-for="source in sources ?? []"
            :key="source.id"
            class="od-card p-3.5 flex flex-col gap-2"
          >
            <div class="flex items-center gap-2">
              <span class="text-fg text-sm font-medium truncate flex-1">{{ source.name }}</span>
              <span
                v-if="source.isBuiltin"
                class="px-1.5 py-0.5 rounded bg-fg/5 text-muted text-[11px] shrink-0"
              >内置</span>
            </div>
            <p class="text-muted text-xs">
              <template v-if="statuses?.[source.id]?.lastError">
                <span class="text-danger">抓取失败：{{ statuses[source.id].lastError }}</span>
              </template>
              <template v-else>
                {{ statuses?.[source.id]?.count ?? 0 }} 条提示词
              </template>
            </p>
            <div class="flex items-center gap-1.5">
              <button
                class="od-btn text-xs !px-2.5 !py-1"
                :class="source.isActive ? 'od-btn-primary' : 'od-btn-ghost'"
                :disabled="toggleSourceMutation.isPending.value"
                @click="toggleSourceMutation.mutate(source)"
              >
                {{ source.isActive ? '已启用' : '已停用' }}
              </button>
              <button
                class="od-icon-btn !w-8 !h-8"
                title="刷新该源"
                :disabled="refreshingId === source.id"
                @click="refreshingId = source.id; refreshSourceMutation.mutate(source.id)"
              >
                <AppIcon
                  name="refresh-cw"
                  :size="14"
                />
              </button>
              <button
                v-if="!source.isBuiltin"
                class="od-icon-btn !w-8 !h-8 hover:!text-danger hover:!border-danger/40"
                title="删除"
                @click="deletingSource = source"
              >
                <AppIcon
                  name="trash-2"
                  :size="14"
                />
              </button>
            </div>
          </div>
        </aside>

        <!-- 右栏：提示词卡片 -->
        <section class="min-w-0">
          <!-- 过滤工具栏 -->
          <div class="flex items-center gap-3 flex-wrap mb-4">
            <select
              v-model="category"
              class="od-input !w-48 max-sm:!w-full"
              @change="resetPage"
            >
              <option :value="ALL_PROMPTS_OPTION">
                全部分类
              </option>
              <option
                v-for="c in promptData?.categories ?? []"
                :key="c"
                :value="c"
              >
                {{ c }}
              </option>
            </select>
            <div class="relative ml-auto">
              <AppIcon
                name="search"
                :size="15"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              />
              <input
                v-model="keyword"
                class="od-input !pl-9 !w-56 max-sm:!w-full"
                placeholder="搜索标题 / 内容 / 标签"
              >
            </div>
          </div>

          <!-- 标签 chips -->
          <div
            v-if="promptData?.tags.length"
            class="flex flex-wrap gap-2 mb-4"
          >
            <button
              v-for="tag in promptData.tags.slice(0, 30)"
              :key="tag"
              class="px-2.5 py-1 rounded-md text-xs transition-colors"
              :class="activeTags.includes(tag)
                ? 'bg-accent text-white'
                : 'bg-fg/5 text-muted hover:bg-fg/10'"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>

          <div
            v-if="isLoading"
            class="text-muted text-center py-20"
          >
            加载中...
          </div>

          <EmptyState
            v-else-if="!promptData?.items.length"
            icon="type"
            title="没有匹配的提示词"
            description="换个关键词，或在左侧启用更多提示词源"
          />

          <template v-else>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              <article
                v-for="prompt in promptData.items"
                :key="`${prompt.sourceId}:${prompt.id}`"
                class="od-card overflow-hidden cursor-pointer hover:shadow-lift transition-shadow"
                @click="viewingPrompt = prompt"
              >
                <div class="aspect-[4/3] bg-fg/5 overflow-hidden">
                  <img
                    v-if="prompt.coverUrl"
                    :src="prompt.coverUrl"
                    :alt="prompt.title"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  >
                </div>
                <div class="p-3.5">
                  <h3 class="text-fg text-sm font-medium truncate">
                    {{ prompt.title }}
                  </h3>
                  <p class="text-muted text-xs truncate mt-1">
                    {{ prompt.category }}
                  </p>
                </div>
              </article>
            </div>

            <!-- 分页 -->
            <div
              v-if="totalPages > 1"
              class="flex items-center justify-center gap-3 mt-6"
            >
              <button
                class="od-btn od-btn-ghost !px-3 !py-1.5 text-sm"
                :disabled="page <= 1"
                @click="page -= 1"
              >
                上一页
              </button>
              <span class="text-muted text-sm">{{ page }} / {{ totalPages }}</span>
              <button
                class="od-btn od-btn-ghost !px-3 !py-1.5 text-sm"
                :disabled="page >= totalPages"
                @click="page += 1"
              >
                下一页
              </button>
            </div>
          </template>
        </section>
      </div>
    </main>

    <!-- 提示词详情弹窗 -->
    <template v-if="viewingPrompt">
      <div
        class="od-modal-overlay"
        @click.self="viewingPrompt = null"
      />
      <div class="fixed inset-0 grid place-items-center pointer-events-none z-50 p-6">
        <div class="od-card pointer-events-auto w-full max-w-[560px] max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-fg font-semibold text-lg truncate">
                {{ viewingPrompt.title }}
              </h2>
              <p class="text-muted text-xs mt-1">
                {{ viewingPrompt.category }}
                <template v-if="viewingPrompt.author">
                  · {{ viewingPrompt.author }}
                </template>
              </p>
            </div>
            <button
              class="od-icon-btn !w-9 !h-9 shrink-0"
              aria-label="关闭"
              @click="viewingPrompt = null"
            >
              <AppIcon
                name="x"
                :size="16"
              />
            </button>
          </div>

          <img
            v-if="viewingPrompt.coverUrl"
            :src="viewingPrompt.coverUrl"
            :alt="viewingPrompt.title"
            class="w-full rounded-xl object-cover max-h-[280px]"
          >

          <p
            v-if="viewingPrompt.description"
            class="text-muted text-sm"
          >
            {{ viewingPrompt.description }}
          </p>

          <div class="rounded-xl bg-fg/5 p-4 text-fg text-sm whitespace-pre-wrap break-words max-h-[240px] overflow-y-auto">
            {{ viewingPrompt.prompt }}
          </div>

          <div
            v-if="viewingPrompt.tags.length"
            class="flex flex-wrap gap-2"
          >
            <span
              v-for="tag in viewingPrompt.tags"
              :key="tag"
              class="px-2 py-1 rounded-md bg-accent-soft text-accent-strong text-xs"
            >
              {{ tag }}
            </span>
          </div>

          <div class="flex gap-3">
            <button
              class="od-btn od-btn-primary flex-1"
              @click="copyPrompt(viewingPrompt)"
            >
              {{ copied ? '已复制' : '复制提示词' }}
            </button>
            <a
              v-if="viewingPrompt.githubUrl"
              :href="viewingPrompt.githubUrl"
              target="_blank"
              rel="noopener"
              class="od-btn od-btn-ghost"
            >
              来源
            </a>
          </div>
        </div>
      </div>
    </template>

    <ConfirmDeleteModal
      v-if="deletingSource"
      title="删除提示词源"
      :message="`确定删除「${deletingSource.name}」吗？`"
      :deleting="deleteSourceMutation.isPending.value"
      :error="deleteSourceMutation.isError.value"
      @cancel="deletingSource = null"
      @confirm="deleteSourceMutation.mutate(deletingSource.id)"
    />
  </div>
</template>
