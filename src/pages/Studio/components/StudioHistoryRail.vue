<script setup lang="ts">
// 左侧历史栏：+ 新的一次 + 缩略图 tab。窄屏变顶部横滑条。
// 桌面端右缘拖拽调宽（96–280px），写入 localStorage。缩略图固定 64×64，拉宽只换列。
import { computed } from 'vue'
import { mediaUrl } from '../../../lib/media-api'
import { isFailedStatus, isPendingStatus } from '../../../lib/studio/params'
import type { StudioResult } from '../../../lib/studio/types'
import type { ModelCapability } from '../../../types/ai-generation'
import AppIcon from '../../../components/AppIcon.vue'
import {
  RAIL_WIDTH_MAX,
  RAIL_WIDTH_MIN,
  railItemVtName,
  useStudioRailWidth,
} from '../composables/useStudioRailWidth'

const props = defineProps<{
  items: StudioResult[]
  selectedKey: string | null
  capability: ModelCapability
  now: number
}>()

const emit = defineEmits<{
  select: [key: string]
  draft: []
  loadMore: []
  remove: [key: string]
}>()

function elapsed(item: StudioResult): string {
  const sec = Math.max(0, Math.floor((props.now - item.startedAt) / 1000))
  return `${sec}s`
}

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  const along = el.scrollHeight - el.scrollTop - el.clientHeight
  const across = el.scrollWidth - el.scrollLeft - el.clientWidth
  // 竖滑（桌面）或横滑（窄屏）靠近尽头再拉下一页。
  if (along < 40 || across < 40) emit('loadMore')
}

const isAudio = computed(() => props.capability === 'audio')
const { width, dragging, onPointerDown, reset } = useStudioRailWidth()
</script>

<template>
  <aside
    class="relative flex shrink-0 gap-3 border-b border-border p-3 md:h-full md:flex-col md:overflow-hidden md:border-r md:border-b-0"
    :style="{ '--studio-rail-width': `${width}px` }"
  >
    <button
      class="od-icon-btn !h-16 !w-16 shrink-0"
      title="新的一次"
      aria-label="新的一次"
      @click="emit('draft')"
    >
      <AppIcon
        name="plus"
        :size="18"
      />
    </button>

    <div
      class="studio-rail-scroll flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto md:grid md:auto-rows-[64px] md:grid-cols-[repeat(auto-fill,64px)] md:justify-start md:overflow-x-hidden md:overflow-y-auto"
      @scroll.passive="onScroll"
    >
      <div
        v-for="item in items"
        :key="item.key"
        class="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
        :style="{ viewTransitionName: railItemVtName(item.key) }"
      >
        <button
          class="relative h-full w-full overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent/50"
          :title="item.prompt.slice(0, 40)"
          :aria-label="item.prompt.slice(0, 40) || '生成记录'"
          :aria-current="selectedKey === item.key ? 'true' : undefined"
          @click="emit('select', item.key)"
        >
          <div
            v-if="isPendingStatus(item.status)"
            class="flex h-full w-full flex-col items-center justify-center bg-accent-soft"
          >
            <span class="animate-pulse text-[10px] text-accent-strong">{{ elapsed(item) }}</span>
          </div>
          <div
            v-else-if="isFailedStatus(item.status)"
            class="flex h-full w-full items-center justify-center bg-danger/10"
          >
            <AppIcon
              name="alert-circle"
              :size="16"
              class="text-danger"
            />
          </div>
          <img
            v-else-if="capability === 'image' && item.media"
            :src="mediaUrl(item.media.url)"
            alt=""
            class="h-full w-full object-cover"
          >
          <div
            v-else-if="capability === 'video' && item.media"
            class="relative h-full w-full bg-fg/10"
          >
            <video
              :src="mediaUrl(item.media.url)"
              class="h-full w-full object-cover"
              muted
              preload="metadata"
            />
            <span class="absolute right-0.5 bottom-0.5 text-fg">
              <AppIcon
                name="video"
                :size="10"
              />
            </span>
          </div>
          <div
            v-else-if="isAudio"
            class="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-accent-soft px-1"
          >
            <AppIcon
              name="music"
              :size="14"
              class="text-accent-strong"
            />
            <span class="w-full truncate text-center text-[9px] text-muted">{{
              String(item.params.voice ?? '')
            }}</span>
          </div>
        </button>
        <button
          type="button"
          class="studio-rail-del absolute top-0 right-0 z-10 flex h-9 w-9 items-start justify-end pt-0.5 pr-0.5 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
          title="删除"
          aria-label="删除"
          @click.stop="emit('remove', item.key)"
        >
          <AppIcon
            name="x"
            :size="12"
          />
        </button>
      </div>
    </div>

    <div
      class="absolute top-0 right-0 hidden h-full w-2 translate-x-1/2 cursor-col-resize md:block"
      role="separator"
      aria-orientation="vertical"
      aria-label="调整历史栏宽度"
      :aria-valuemin="RAIL_WIDTH_MIN"
      :aria-valuemax="RAIL_WIDTH_MAX"
      :aria-valuenow="width"
      :class="dragging ? 'bg-accent/40' : 'hover:bg-accent/25'"
      title="拖拽调节宽度，双击恢复默认"
      @pointerdown="onPointerDown"
      @dblclick="reset"
    />
  </aside>
</template>

<style scoped>
@media (min-width: 768px) {
  aside {
    width: var(--studio-rail-width, 96px);
  }
}

/* 比全局 6px 通栏更细、两端留白更短，避免贴满 80px 历史栏 */
.studio-rail-scroll {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklch, var(--fg) 22%, transparent) transparent;
}
.studio-rail-scroll::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}
.studio-rail-scroll::-webkit-scrollbar-track {
  background: transparent;
  margin-block: 12px;
  margin-inline: 12px;
}
.studio-rail-scroll::-webkit-scrollbar-thumb {
  background: color-mix(in oklch, var(--fg) 22%, transparent);
  border-radius: 99px;
}
.studio-rail-scroll::-webkit-scrollbar-thumb:hover {
  background: color-mix(in oklch, var(--fg) 38%, transparent);
}

/* 右上角径向淡出，避免 linear 切出一块三角 */
.studio-rail-del {
  background: radial-gradient(120% 120% at 100% 0%, rgb(0 0 0 / 0.45) 0%, rgb(0 0 0 / 0) 70%);
}
.studio-rail-del :deep(svg) {
  filter: drop-shadow(0 0 2px rgb(0 0 0 / 0.55));
}
</style>

<style>
/* View Transitions 画在 html 上，不能 scoped。关掉整页淡入淡出，只让具名缩略图滑过去。 */
html.studio-rail-vt::view-transition-old(root),
html.studio-rail-vt::view-transition-new(root) {
  animation: none;
}
html.studio-rail-vt::view-transition-group(root) {
  animation: none;
}
</style>
