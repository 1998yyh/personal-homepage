<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { assetsApi } from '../../lib/assets-api'
import { exportAssets, importAssets } from '../../lib/assets-export'
import { mediaApi, mediaUrl } from '../../lib/media-api'
import type { Asset, AssetKind } from '../../types/asset'
import { useAuthStore } from '../../stores/auth'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import EmptyState from '../../components/EmptyState.vue'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal.vue'

const router = useRouter()
const auth = useAuthStore()
const queryClient = useQueryClient()

const PAGE_SIZE = 24

const KIND_TABS: Array<{ value: AssetKind | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'text', label: '文本' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
]

const kind = ref<AssetKind | ''>('')
const keyword = ref('')
const page = ref(1)

const { data, isLoading } = useQuery({
  queryKey: ['assets', kind, keyword, page],
  queryFn: () =>
    assetsApi.list({
      kind: kind.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      limit: PAGE_SIZE,
    }),
  enabled: computed(() => auth.isAuthenticated),
})

const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / PAGE_SIZE)))

const switchKind = (next: AssetKind | '') => {
  kind.value = next
  page.value = 1
}

// ---- 新建素材抽屉 ----
const showCreate = ref(false)
const createError = ref<string | null>(null)
const createForm = reactive({
  kind: 'text' as AssetKind,
  title: '',
  textContent: '',
  tags: '',
  source: '',
  note: '',
})
const createFile = ref<File | null>(null)

const openCreate = () => {
  createForm.kind = 'text'
  createForm.title = ''
  createForm.textContent = ''
  createForm.tags = ''
  createForm.source = ''
  createForm.note = ''
  createFile.value = null
  createError.value = null
  showCreate.value = true
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  createFile.value = input.files?.[0] ?? null
}

const createMutation = useMutation({
  mutationFn: async () => {
    const tags = createForm.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (createForm.kind === 'text') {
      return assetsApi.create({
        kind: 'text',
        title: createForm.title.trim(),
        textContent: createForm.textContent,
        tags,
        source: createForm.source.trim() || undefined,
        note: createForm.note.trim() || undefined,
      })
    }
    // 图片/视频：先上传媒体再建素材
    const media = await mediaApi.upload(createFile.value!)
    return assetsApi.create({
      kind: createForm.kind,
      title: createForm.title.trim() || createFile.value!.name,
      mediaId: media.id,
      tags,
      source: createForm.source.trim() || undefined,
      note: createForm.note.trim() || undefined,
    })
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    showCreate.value = false
  },
  onError: (e) => {
    createError.value =
      (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
      '创建失败，请稍后重试'
  },
})

const submitCreate = () => {
  createError.value = null
  if (createForm.kind === 'text') {
    if (!createForm.title.trim()) {
      createError.value = '请填写标题'
      return
    }
    if (!createForm.textContent.trim()) {
      createError.value = '请填写文本内容'
      return
    }
  } else if (!createFile.value) {
    createError.value = `请选择${createForm.kind === 'image' ? '图片' : '视频'}文件`
    return
  }
  createMutation.mutate()
}

// ---- ZIP 导入 / 导出 ----
const exportingZip = ref(false)
const importingZip = ref(false)
const zipMessage = ref<string | null>(null)
const zipInputRef = ref<HTMLInputElement | null>(null)

const handleExportZip = async () => {
  if (exportingZip.value) return
  exportingZip.value = true
  zipMessage.value = null
  try {
    // 拉全量（当前筛选条件下的第一页大容量）
    const all = await assetsApi.list({
      kind: kind.value || undefined,
      keyword: keyword.value || undefined,
      page: 1,
      limit: 500,
    })
    const count = await exportAssets(all.items)
    zipMessage.value = `已导出 ${count} 个素材`
  } catch {
    zipMessage.value = '导出失败，请稍后重试'
  } finally {
    exportingZip.value = false
  }
}

const handleImportZipFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importingZip.value = true
  zipMessage.value = null
  try {
    const count = await importAssets(file)
    zipMessage.value = `已导入 ${count} 个素材`
    queryClient.invalidateQueries({ queryKey: ['assets'] })
  } catch {
    zipMessage.value = '导入失败：不是有效的素材 zip'
  } finally {
    importingZip.value = false
  }
}

// ---- 详情 / 删除 ----
const viewingAsset = ref<Asset | null>(null)
const copied = ref(false)

const copyText = async (asset: Asset) => {
  try {
    await navigator.clipboard.writeText(asset.textContent || '')
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copied.value = false
  }
}

const deletingAsset = ref<Asset | null>(null)
const deleteMutation = useMutation({
  mutationFn: (id: string) => assetsApi.remove(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    deletingAsset.value = null
  },
})
</script>

<template>
  <div class="min-h-screen">
    <Navbar />

    <main class="max-w-[1280px] mx-auto px-6 py-10">
      <div class="flex items-end justify-between gap-4 flex-wrap mb-7">
        <div>
          <div class="eyebrow">
            Assets
          </div>
          <h1 class="font-display text-2xl font-bold tracking-[-0.01em] text-fg">
            素材库
          </h1>
          <p class="text-muted text-sm mt-1.5">
            收藏提示词文本与生成的图片 / 视频，Agent 可直接读写
          </p>
        </div>
        <div
          v-if="auth.isAuthenticated"
          class="flex items-center gap-2"
        >
          <button
            class="od-btn od-btn-ghost"
            :disabled="importingZip"
            @click="zipInputRef?.click()"
          >
            <AppIcon
              name="upload"
              :size="16"
            />
            {{ importingZip ? '导入中...' : '导入 zip' }}
          </button>
          <button
            class="od-btn od-btn-ghost"
            :disabled="exportingZip"
            @click="handleExportZip"
          >
            <AppIcon
              name="download"
              :size="16"
            />
            {{ exportingZip ? '导出中...' : '导出 zip' }}
          </button>
          <button
            class="od-btn od-btn-primary"
            @click="openCreate"
          >
            <AppIcon
              name="plus"
              :size="16"
            />
            新建素材
          </button>
          <input
            ref="zipInputRef"
            type="file"
            accept=".zip,application/zip"
            class="hidden"
            @change="handleImportZipFile"
          >
        </div>
      </div>

      <p
        v-if="zipMessage"
        class="text-muted text-sm mb-4"
      >
        {{ zipMessage }}
      </p>

      <EmptyState
        v-if="!auth.isAuthenticated"
        icon="image"
        title="登录后管理素材库"
        description="素材库收藏你的提示词与媒体内容，登录即可使用"
        action-text="去登录"
        @action="router.push({ path: '/login', query: { redirect: '/assets' } })"
      />

      <template v-else>
        <!-- 工具栏：类型 Tab + 搜索 -->
        <div class="flex items-center gap-3 flex-wrap mb-5">
          <div class="flex gap-2">
            <button
              v-for="tab in KIND_TABS"
              :key="tab.value"
              class="od-btn !px-3.5 !py-1.5 text-sm"
              :class="kind === tab.value ? 'od-btn-primary' : 'od-btn-ghost'"
              @click="switchKind(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="relative ml-auto">
            <AppIcon
              name="search"
              :size="15"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              v-model="keyword"
              class="od-input !pl-9 !w-56 max-sm:!w-full"
              placeholder="搜索标题 / 内容 / 备注"
              @input="page = 1"
            >
          </div>
        </div>

        <div
          v-if="isLoading"
          class="text-muted text-center py-20"
        >
          加载中...
        </div>

        <EmptyState
          v-else-if="!data?.items.length"
          icon="image"
          :title="keyword || kind ? '没有匹配的素材' : '还没有素材'"
          :description="keyword || kind ? '换个条件试试' : '收藏一段提示词或一张图片，生成时随取随用'"
          :action-text="keyword || kind ? undefined : '新建素材'"
          @action="openCreate"
        />

        <template v-else>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            <article
              v-for="asset in data.items"
              :key="asset.id"
              class="od-card overflow-hidden cursor-pointer hover:shadow-lift transition-shadow group"
              @click="viewingAsset = asset"
            >
              <div
                v-if="asset.kind === 'image' && asset.media"
                class="aspect-[4/3] bg-fg/5 overflow-hidden"
              >
                <img
                  :src="mediaUrl(asset.media.url)"
                  :alt="asset.title"
                  class="w-full h-full object-cover"
                  loading="lazy"
                >
              </div>
              <div
                v-else-if="asset.kind === 'video' && asset.media"
                class="aspect-[4/3] bg-fg/5 overflow-hidden"
              >
                <video
                  :src="mediaUrl(asset.media.url)"
                  class="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              </div>
              <div
                v-else
                class="aspect-[4/3] bg-fg/5 p-3.5 overflow-hidden"
              >
                <p class="text-muted text-xs line-clamp-[8] whitespace-pre-wrap break-words font-mono">
                  {{ asset.textContent }}
                </p>
              </div>
              <div class="p-3.5 flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <h3 class="text-fg text-sm font-medium truncate">
                    {{ asset.title }}
                  </h3>
                  <p class="text-muted text-xs mt-0.5">
                    {{ KIND_TABS.find((t) => t.value === asset.kind)?.label }}
                    <template v-if="asset.tags?.length">
                      · {{ asset.tags.join(' / ') }}
                    </template>
                  </p>
                </div>
                <button
                  class="od-icon-btn !w-8 !h-8 shrink-0 opacity-0 group-hover:opacity-100 hover:!text-danger hover:!border-danger/40"
                  title="删除"
                  @click.stop="deletingAsset = asset"
                >
                  <AppIcon
                    name="trash-2"
                    :size="14"
                  />
                </button>
              </div>
            </article>
          </div>

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
      </template>
    </main>

    <!-- 新建素材抽屉 -->
    <template v-if="showCreate">
      <div
        class="od-drawer-overlay"
        @click.self="showCreate = false"
      />
      <aside class="od-drawer">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 class="font-display font-bold text-[17px] text-fg">
            新建素材
          </h2>
          <button
            class="od-icon-btn !w-9 !h-9"
            aria-label="关闭"
            @click="showCreate = false"
          >
            <AppIcon
              name="x"
              :size="16"
            />
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <div>
            <label class="od-label">类型</label>
            <div class="flex gap-2">
              <button
                v-for="tab in KIND_TABS.slice(1)"
                :key="tab.value"
                type="button"
                class="od-btn flex-1 !py-1.5 text-sm"
                :class="createForm.kind === tab.value ? 'od-btn-primary' : 'od-btn-ghost'"
                @click="createForm.kind = tab.value as AssetKind; createFile = null"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="od-label">标题 {{ createForm.kind === 'text' ? '*' : '（留空用文件名）' }}</label>
            <input
              v-model="createForm.title"
              class="od-input"
              autocomplete="off"
              placeholder="素材标题"
            >
          </div>

          <div v-if="createForm.kind === 'text'">
            <label class="od-label">文本内容 *</label>
            <textarea
              v-model="createForm.textContent"
              class="od-input resize-y min-h-[140px]"
              rows="6"
              placeholder="提示词、文案、脚本……"
            />
          </div>

          <div v-else>
            <label class="od-label">{{ createForm.kind === 'image' ? '图片' : '视频' }}文件 *</label>
            <input
              type="file"
              :accept="createForm.kind === 'image' ? 'image/*' : 'video/*'"
              class="od-input"
              @change="handleFileChange"
            >
            <p
              v-if="createFile"
              class="text-muted text-xs mt-1.5"
            >
              已选择：{{ createFile.name }}
            </p>
          </div>

          <div>
            <label class="od-label">标签（逗号分隔）</label>
            <input
              v-model="createForm.tags"
              class="od-input"
              autocomplete="off"
              placeholder="如：人像, 电影感"
            >
          </div>

          <div>
            <label class="od-label">来源</label>
            <input
              v-model="createForm.source"
              class="od-input"
              autocomplete="off"
              placeholder="如：提示词库 / 画布生成"
            >
          </div>

          <div>
            <label class="od-label">备注</label>
            <input
              v-model="createForm.note"
              class="od-input"
              autocomplete="off"
            >
          </div>

          <p
            v-if="createError"
            class="od-error"
          >
            {{ createError }}
          </p>
        </div>

        <div class="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            class="od-btn od-btn-ghost flex-1"
            @click="showCreate = false"
          >
            取消
          </button>
          <button
            type="button"
            class="od-btn od-btn-primary flex-1"
            :disabled="createMutation.isPending.value"
            @click="submitCreate"
          >
            {{ createMutation.isPending.value ? '创建中...' : '创建' }}
          </button>
        </div>
      </aside>
    </template>

    <!-- 素材详情弹窗 -->
    <template v-if="viewingAsset">
      <div
        class="od-modal-overlay"
        @click.self="viewingAsset = null"
      />
      <div class="fixed inset-0 grid place-items-center pointer-events-none z-50 p-6">
        <div class="od-card pointer-events-auto w-full max-w-[560px] max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-fg font-semibold text-lg truncate">
                {{ viewingAsset.title }}
              </h2>
              <p class="text-muted text-xs mt-1">
                {{ KIND_TABS.find((t) => t.value === viewingAsset!.kind)?.label }}
                <template v-if="viewingAsset.source">
                  · 来源：{{ viewingAsset.source }}
                </template>
              </p>
            </div>
            <button
              class="od-icon-btn !w-9 !h-9 shrink-0"
              aria-label="关闭"
              @click="viewingAsset = null"
            >
              <AppIcon
                name="x"
                :size="16"
              />
            </button>
          </div>

          <img
            v-if="viewingAsset.kind === 'image' && viewingAsset.media"
            :src="mediaUrl(viewingAsset.media.url)"
            :alt="viewingAsset.title"
            class="w-full rounded-xl object-contain max-h-[320px]"
          >
          <video
            v-else-if="viewingAsset.kind === 'video' && viewingAsset.media"
            :src="mediaUrl(viewingAsset.media.url)"
            class="w-full rounded-xl max-h-[320px]"
            controls
          />
          <div
            v-else
            class="rounded-xl bg-fg/5 p-4 text-fg text-sm whitespace-pre-wrap break-words max-h-[280px] overflow-y-auto"
          >
            {{ viewingAsset.textContent }}
          </div>

          <p
            v-if="viewingAsset.note"
            class="text-muted text-sm"
          >
            {{ viewingAsset.note }}
          </p>

          <div
            v-if="viewingAsset.tags?.length"
            class="flex flex-wrap gap-2"
          >
            <span
              v-for="tag in viewingAsset.tags"
              :key="tag"
              class="px-2 py-1 rounded-md bg-accent-soft text-accent-strong text-xs"
            >
              {{ tag }}
            </span>
          </div>

          <button
            v-if="viewingAsset.kind === 'text'"
            class="od-btn od-btn-primary"
            @click="copyText(viewingAsset)"
          >
            {{ copied ? '已复制' : '复制内容' }}
          </button>
        </div>
      </div>
    </template>

    <ConfirmDeleteModal
      v-if="deletingAsset"
      title="删除素材"
      :message="`确定删除「${deletingAsset.title}」吗？关联的媒体文件保留在媒体库中。`"
      :deleting="deleteMutation.isPending.value"
      :error="deleteMutation.isError.value"
      @cancel="deletingAsset = null"
      @confirm="deleteMutation.mutate(deletingAsset.id)"
    />
  </div>
</template>
