<script setup lang="ts">
// 任务历史：跨能力任务全宽表格 + 状态过滤 + 同参数重试 + 成功存素材。
// 沿用原型变体 A 历史页画面（filter chips + 全宽表格）。
import { ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { generationApi } from '../../lib/generation-api'
import { toModelRef } from '../../lib/channels-api'
import { showToast } from '../../composables/useToast'
import {
  CAP_LABEL,
  STATUS_LABEL,
  capabilityToAssetKind,
  isFailedStatus,
  statusChipClass,
} from '../../lib/studio/params'
import { saveMediaAsAsset } from '../../lib/studio/assets'
import {
  GenerationTaskStatus,
  type GenerationTaskView,
} from '../../types/ai-generation'
import AppIcon from '../../components/AppIcon.vue'

// 状态过滤：直接映射后端单值 status（pending 罕见，归入「全部」）
type FilterKey = 'all' | 'processing' | 'succeeded' | 'failed'
const FILTERS: Array<{ key: FilterKey; label: string; status?: GenerationTaskStatus }> = [
  { key: 'all', label: '全部' },
  { key: 'processing', label: '生成中', status: GenerationTaskStatus.Processing },
  { key: 'succeeded', label: '已完成', status: GenerationTaskStatus.Succeeded },
  { key: 'failed', label: '失败', status: GenerationTaskStatus.Failed },
]
const filter = ref<FilterKey>('all')

const queryClient = useQueryClient()
const { data, isFetching } = useQuery({
  queryKey: ['studio-tasks', filter],
  queryFn: () =>
    generationApi.listTasks({
      page: 1,
      limit: 50,
      status: FILTERS.find((f) => f.key === filter.value)?.status,
    }),
})

function refresh() {
  void queryClient.invalidateQueries({ queryKey: ['studio-tasks'] })
}

/** 同参数重试：按 task 的 channelId+model+params 重发对应 generate* */
async function retryTask(task: GenerationTaskView) {
  const modelRef = toModelRef(task.channelId, task.model)
  const params = (task.params ?? {}) as Record<string, string>
  try {
    if (task.capability === 'image') {
      await generationApi.generateImage({ modelRef, prompt: task.prompt, ...params })
    } else if (task.capability === 'video') {
      await generationApi.generateVideo({ modelRef, prompt: task.prompt, ...params })
    } else if (task.capability === 'audio') {
      await generationApi.generateAudio({ modelRef, prompt: task.prompt, ...params })
    }
    showToast('已重新发起生成', 'success')
    refresh()
  } catch {
    showToast('重试失败，请稍后重试', 'error')
  }
}

async function saveAsset(task: GenerationTaskView) {
  if (!task.resultMediaId) return
  await saveMediaAsAsset(
    task.capability,
    task.resultMediaId,
    task.prompt.slice(0, 40) || `${CAP_LABEL[task.capability]}生成结果`,
  )
}

const canSaveAsset = (t: GenerationTaskView) =>
  t.status === GenerationTaskStatus.Succeeded &&
  !!t.resultMediaId &&
  capabilityToAssetKind(t.capability) !== null
</script>

<template>
  <div class="space-y-4">
    <!-- filter chips -->
    <div class="flex items-center gap-2">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        class="od-chip border transition"
        :class="
          filter === f.key
            ? 'border-accent bg-accent-soft text-accent-strong'
            : 'border-border text-muted hover:text-fg'
        "
        @click="filter = f.key"
      >
        {{ f.label }}
      </button>
      <button
        class="od-icon-btn ml-auto"
        title="刷新"
        @click="refresh"
      >
        <AppIcon
          name="refresh-cw"
          :size="15"
        />
      </button>
    </div>

    <!-- 全宽表格 -->
    <div class="od-panel overflow-x-auto !p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-muted">
            <th class="px-4 py-3">
              时间
            </th>
            <th class="py-3">
              能力
            </th>
            <th class="py-3">
              模型
            </th>
            <th class="py-3">
              提示词
            </th>
            <th class="py-3">
              状态
            </th>
            <th class="px-4 py-3 text-right">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in data?.items ?? []"
            :key="t.id"
            class="border-t border-border"
          >
            <td class="px-4 py-3 text-xs whitespace-nowrap text-muted">
              {{ new Date(t.createdAt).toLocaleString('zh-CN', { hour12: false }) }}
            </td>
            <td class="py-3 text-xs">
              {{ CAP_LABEL[t.capability] }}
            </td>
            <td class="py-3 text-xs text-muted">
              {{ t.model }}
            </td>
            <td class="max-w-[280px] truncate py-3 text-xs">
              {{ t.prompt }}
            </td>
            <td class="py-3">
              <span
                class="od-chip border"
                :class="statusChipClass(t.status)"
              >
                {{ STATUS_LABEL[t.status] }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="isFailedStatus(t.status)"
                class="od-icon-btn"
                title="同参数重试"
                @click="retryTask(t)"
              >
                <AppIcon
                  name="redo"
                  :size="14"
                />
              </button>
              <button
                v-else-if="canSaveAsset(t)"
                class="od-icon-btn"
                title="存为素材"
                @click="saveAsset(t)"
              >
                <AppIcon
                  name="download"
                  :size="14"
                />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p
        v-if="isFetching"
        class="py-8 text-center text-sm text-muted"
      >
        加载中…
      </p>
      <p
        v-else-if="!data?.items.length"
        class="py-8 text-center text-sm text-muted"
      >
        暂无生成任务
      </p>
    </div>
  </div>
</template>

