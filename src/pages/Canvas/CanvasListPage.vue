<script setup lang="ts">
// 画布列表页：项目卡片网格 + 新建/搜索/删除
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { canvasApi } from '../../lib/canvas-api';
import type { CanvasProjectSummary } from '../../types/canvas-api';
import { useAuthStore } from '../../stores/auth';
import { showToast } from '../../composables/useToast';
import Navbar from '../../components/Navbar.vue';
import EmptyState from '../../components/EmptyState.vue';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal.vue';
import AppIcon from '../../components/AppIcon.vue';

const router = useRouter();
const queryClient = useQueryClient();
const auth = useAuthStore();

const keyword = ref('');
const page = ref(1);

const { data, isLoading, isError } = useQuery({
  queryKey: computed(() => ['canvas-projects', page.value, keyword.value]),
  queryFn: () => canvasApi.list({ page: page.value, limit: 24, keyword: keyword.value || undefined }),
  enabled: computed(() => auth.isAuthenticated),
});

const projects = computed(() => data.value?.items ?? []);
const totalPages = computed(() => data.value?.totalPages ?? 1);

function handleSearch() {
  page.value = 1;
  queryClient.invalidateQueries({ queryKey: ['canvas-projects'] });
}

// ── 新建 ─────────────────────────────────────────────────────
const creating = ref(false);

async function handleCreate() {
  if (creating.value) return;
  creating.value = true;
  try {
    const project = await canvasApi.create(`画布 ${new Date().toLocaleDateString('zh-CN')}`);
    router.push(`/canvas/${project.id}`);
  } catch {
    // 创建失败：保持列表页，toast 提示
    showToast('创建画布失败，请稍后重试');
  } finally {
    creating.value = false;
  }
}

// ── 删除 ─────────────────────────────────────────────────────
const deletingProject = ref<CanvasProjectSummary | null>(null);

const deleteMutation = useMutation({
  mutationFn: (id: string) => canvasApi.remove(id),
  onSuccess: () => {
    deletingProject.value = null;
    queryClient.invalidateQueries({ queryKey: ['canvas-projects'] });
  },
});

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="min-h-screen">
    <Navbar />
    <div class="max-w-[1080px] mx-auto px-6 py-10">
      <div class="flex flex-wrap items-center gap-3 mb-8">
        <div>
          <h1 class="font-display text-2xl font-bold text-fg">
            无限画布
          </h1>
          <p class="text-muted text-sm mt-1">
            节点式创作工作台：拖图、连线、组织灵感
          </p>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <input
            v-model="keyword"
            class="od-input h-10 w-56"
            placeholder="搜索画布名称"
            @keydown.enter="handleSearch"
          >
          <button
            class="od-btn od-btn-ghost"
            @click="handleSearch"
          >
            <AppIcon
              name="search"
              :size="16"
            />
            搜索
          </button>
          <button
            v-if="auth.isAuthenticated"
            class="od-btn od-btn-primary"
            :disabled="creating"
            @click="handleCreate"
          >
            <AppIcon
              name="plus"
              :size="16"
            />
            {{ creating ? '创建中…' : '新建画布' }}
          </button>
        </div>
      </div>

      <EmptyState
        v-if="!auth.isAuthenticated"
        icon="palette"
        title="登录后使用无限画布"
        description="画布保存在云端，登录即可跨设备创作"
        action-text="去登录"
        @action="router.push({ path: '/login', query: { redirect: '/canvas' } })"
      />
      <div
        v-else-if="isLoading"
        class="py-20 text-center text-muted text-sm"
      >
        加载中…
      </div>
      <div
        v-else-if="isError"
        class="od-error"
      >
        画布列表加载失败，请稍后重试
      </div>
      <EmptyState
        v-else-if="!projects.length"
        icon="palette"
        title="还没有画布"
        description="新建一个画布，开始拖拽式创作"
        action-text="新建画布"
        @action="handleCreate"
      />

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="project in projects"
          :key="project.id"
          class="od-card group relative cursor-pointer p-5 transition hover:shadow-lift"
          @click="router.push(`/canvas/${project.id}`)"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-accent-soft text-accent-strong grid place-items-center shrink-0">
              <AppIcon
                name="palette"
                :size="20"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-fg">
                {{ project.name }}
              </p>
              <p class="text-xs text-muted mt-1">
                {{ project.nodeCount }} 个节点 · {{ project.connectionCount }} 条连线
              </p>
              <p class="text-xs text-muted mt-0.5">
                更新于 {{ formatTime(project.updatedAt) }}
              </p>
            </div>
            <button
              type="button"
              class="od-icon-btn opacity-0 transition group-hover:opacity-100"
              title="删除画布"
              aria-label="删除画布"
              @click.stop="deletingProject = project"
            >
              <AppIcon
                name="trash-2"
                :size="16"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div
        v-if="totalPages > 1"
        class="mt-8 flex items-center justify-center gap-3 text-sm"
      >
        <button
          class="od-btn od-btn-ghost"
          :disabled="page <= 1"
          @click="page--"
        >
          上一页
        </button>
        <span class="text-muted">{{ page }} / {{ totalPages }}</span>
        <button
          class="od-btn od-btn-ghost"
          :disabled="page >= totalPages"
          @click="page++"
        >
          下一页
        </button>
      </div>
    </div>

    <ConfirmDeleteModal
      v-if="deletingProject"
      title="删除画布"
      :message="`确定删除「${deletingProject.name}」吗？画布内容将无法恢复。`"
      :deleting="deleteMutation.isPending.value"
      :error="deleteMutation.isError.value"
      @cancel="deletingProject = null"
      @confirm="deleteMutation.mutate(deletingProject!.id)"
    />
  </div>
</template>
