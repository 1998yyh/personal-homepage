<script setup lang="ts">
// 生成台组合面：历史栏 + 主区当前结果 + composer。会话在 Pinia。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { channelsApi } from '../../../lib/channels-api'
import { modelOptionsFor } from '../../../lib/studio/models'
import type { StudioCapability } from '../../../lib/studio/types'
import type { ModelCapability } from '../../../types/ai-generation'
import { useStudioStore } from '../../../stores/studio'
import { useStudioGenerate } from '../composables/useStudioGenerate'
import StudioHistoryRail from './StudioHistoryRail.vue'
import StudioComposer from './StudioComposer.vue'
import StudioResultStage from './StudioResultStage.vue'
import ResultLightbox from './ResultLightbox.vue'

const props = defineProps<{ capability: ModelCapability }>()
const cap = computed(() => props.capability as StudioCapability)

const store = useStudioStore()
const gen = useStudioGenerate()
gen.bindPolling()

const route = useRoute()
const router = useRouter()
const session = computed(() => store.session(cap.value))
const selected = computed(() => store.selectedItem(cap.value))
const pendingCount = computed(() => store.pendingCount(cap.value))
const previewResult = computed(() => store.previewItem)

const { data: channels } = useQuery({
  queryKey: ['ai-channels'],
  queryFn: () => channelsApi.list(),
})
const modelOptions = computed(() => modelOptionsFor(channels.value, cap.value))

watch(
  modelOptions,
  (opts) => {
    // 渠道列表后到：还没选手动模型时默认第一项，避免每次都卡在「请先选择模型」。
    if (opts[0] && !session.value.composer.modelRef) store.ensureModel(cap.value, opts[0].value)
  },
  { immediate: true },
)

const now = ref(Date.now()) // 1s 心跳，给进行中占位显示已用秒数。
let nowTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
})

// 进页 / 切能力：按 ?t= hydrate；没有 t 且首次进入则选最近一条，再把真实 taskId 写回 URL。
watch(
  () => [cap.value, route.query.t] as const,
  async ([capability, t]) => {
    const taskId = typeof t === 'string' ? t : undefined
    await gen.hydrate(capability, taskId)
    const item = store.selectedItem(capability)
    if (item?.taskId && item.taskId !== taskId) {
      await router.replace({ query: { ...route.query, t: item.taskId } })
    }
  },
  { immediate: true },
)

// 选中变化同步 ?t=（router.replace 不刷历史）。点「+」时删掉 t。
watch(
  () => session.value.selectedKey,
  (key) => {
    const item = key ? session.value.items.find((i) => i.key === key) : null
    const next = item?.taskId
    const current = typeof route.query.t === 'string' ? route.query.t : undefined
    if (next === current) return
    const query = { ...route.query }
    if (next) query.t = next
    else delete query.t
    void router.replace({ query })
  },
)

function onSelect(key: string) {
  store.selectItem(cap.value, key)
  const item = store.selectedItem(cap.value)
  if (item) void gen.fillRefs(cap.value, item)
}

function onDraft() {
  store.startDraft(cap.value)
}

function onRemove(key: string) {
  const item = session.value.items.find((i) => i.key === key)
  if (item) void gen.deleteItem(cap.value, item)
}

function modelLabel() {
  const id = session.value.composer.modelRef
  return modelOptions.value.find((o) => o.value === id)?.label
}

function onGenerate() {
  void gen.runGenerate(cap.value, undefined, modelLabel())
}

function onRetry() {
  if (selected.value) gen.retry(cap.value, selected.value)
}

function onPreview() {
  if (selected.value) store.openPreview(cap.value, selected.value.key)
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col md:flex-row">
    <StudioHistoryRail
      :items="session.items"
      :selected-key="session.selectedKey"
      :capability="cap"
      :now="now"
      @select="onSelect"
      @draft="onDraft"
      @remove="onRemove"
      @load-more="gen.loadMore(cap)"
    />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        v-if="selected"
        class="min-h-0 flex-1 overflow-hidden"
      >
        <StudioResultStage
          :result="selected"
          :capability="cap"
          :now="now"
          @preview="onPreview"
          @download="selected && gen.download(selected)"
          @save-asset="selected && gen.saveAsset(cap, selected)"
          @use-as-reference="selected && gen.useAsReference(cap, selected)"
          @retry="onRetry"
        />
      </div>
      <div :class="selected ? 'shrink-0' : 'flex min-h-0 flex-1 items-center justify-center'">
        <StudioComposer
          :capability="cap"
          :model-options="modelOptions"
          :pending-count="pendingCount"
          :docked="!!selected"
          @generate="onGenerate"
        />
      </div>
    </div>

    <ResultLightbox
      v-if="previewResult && store.preview"
      :result="previewResult"
      :capability="store.preview.capability"
      @close="store.closePreview()"
      @download="previewResult && gen.download(previewResult)"
      @save-asset="previewResult && store.preview && gen.saveAsset(store.preview.capability, previewResult)"
    />
  </div>
</template>
