<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-toolbar.tsx（375 行）
// 底部中央工具坞。antd Button/Segmented/Switch + 自绘 DockTip → Tailwind + title 提示；
// 主题切换（项目已有全局主题）与插件节点入口裁掉；外观弹层保留网格样式 + 图片信息开关。
import { onBeforeUnmount, ref, watch } from 'vue';
import { CanvasNodeType, type CanvasBackgroundMode, type CanvasNodeTypeId } from '../../../types/canvas';
import AppIcon from '../../../components/AppIcon.vue';

const props = defineProps<{
  selectedCount: number;
  canUndo: boolean;
  canRedo: boolean;
  backgroundMode: CanvasBackgroundMode;
  showImageInfo: boolean;
}>();

const emit = defineEmits<{
  addNode: [type: CanvasNodeTypeId];
  upload: [];
  undo: [];
  redo: [];
  deleteSelected: [];
  clear: [];
  deselect: [];
  backgroundModeChange: [mode: CanvasBackgroundMode];
  showImageInfoChange: [show: boolean];
}>();

const appearanceOpen = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);

type Tool = { id: string; label: string; icon: string; danger?: boolean; disabled?: boolean; action: () => void };

const nodeTools: { type: CanvasNodeTypeId; label: string; icon: string }[] = [
  { type: CanvasNodeType.Text, label: '文本', icon: 'type' },
  { type: CanvasNodeType.Image, label: '图片', icon: 'image' },
  { type: CanvasNodeType.Video, label: '视频', icon: 'video' },
  { type: CanvasNodeType.Audio, label: '音频', icon: 'music' },
  { type: CanvasNodeType.Config, label: '生成配置', icon: 'sliders' },
  { type: CanvasNodeType.Group, label: '分组', icon: 'group' },
];

const backgroundModes: { value: CanvasBackgroundMode; label: string; icon: string }[] = [
  { value: 'dots', label: '点阵', icon: 'circle-dot' },
  { value: 'lines', label: '网格', icon: 'grid' },
  { value: 'blank', label: '空白', icon: 'square' },
];

const leadingTools: Tool[] = [
  { id: 'hand', label: '移动 / 取消选择', icon: 'hand', action: () => emit('deselect') },
  { id: 'undo', label: '撤销', icon: 'undo', disabled: !props.canUndo, action: () => emit('undo') },
  { id: 'redo', label: '重做', icon: 'redo', disabled: !props.canRedo, action: () => emit('redo') },
];

// 点击工具坞外部关闭外观弹层
function handleOutsidePointerDown(event: PointerEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) appearanceOpen.value = false;
}

watch(appearanceOpen, (open) => {
  if (open) document.addEventListener('pointerdown', handleOutsidePointerDown, true);
  else document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
});
</script>

<template>
  <div
    ref="rootRef"
    class="pointer-events-none absolute bottom-5 left-1/2 z-50 -translate-x-1/2"
  >
    <div
      class="thin-scrollbar pointer-events-auto flex h-14 max-w-[calc(100vw-200px)] items-center gap-1 overflow-x-auto rounded-xl border border-border bg-surface/90 px-2 shadow-lift backdrop-blur [&>*]:shrink-0"
      @mousedown.stop
      @pointerdown.stop
    >
      <!-- 移动 / 撤销 / 重做 -->
      <button
        v-for="tool in leadingTools"
        :key="tool.id"
        type="button"
        class="grid size-8 min-w-8 place-items-center rounded-lg transition"
        :class="[
          tool.id === 'hand' && !selectedCount ? 'bg-accent-soft text-accent-strong' : 'text-fg hover:bg-accent-soft',
          tool.disabled ? 'opacity-35 pointer-events-none' : '',
        ]"
        :title="tool.label"
        :aria-label="tool.label"
        @click="tool.action"
      >
        <AppIcon
          :name="tool.icon"
          :size="18"
        />
      </button>

      <div class="mx-1 h-6 w-px bg-border" />

      <!-- 新建节点 -->
      <button
        v-for="tool in nodeTools"
        :key="tool.type"
        type="button"
        class="grid size-8 min-w-8 place-items-center rounded-lg text-fg transition hover:bg-accent-soft"
        :title="`新建${tool.label}`"
        :aria-label="`新建${tool.label}`"
        @click="emit('addNode', tool.type)"
      >
        <AppIcon
          :name="tool.icon"
          :size="18"
        />
      </button>
      <button
        type="button"
        class="grid size-8 min-w-8 place-items-center rounded-lg text-fg transition hover:bg-accent-soft"
        title="上传图片 / 视频 / 音频"
        aria-label="上传"
        @click="emit('upload')"
      >
        <AppIcon
          name="upload"
          :size="18"
        />
      </button>

      <div class="mx-1 h-6 w-px bg-border" />

      <!-- 外观 -->
      <button
        type="button"
        class="grid size-8 min-w-8 place-items-center rounded-lg transition"
        :class="appearanceOpen ? 'bg-accent-soft text-accent-strong' : 'text-fg hover:bg-accent-soft'"
        title="画布外观"
        aria-label="画布外观"
        @click="appearanceOpen = !appearanceOpen"
      >
        <AppIcon
          name="palette"
          :size="18"
        />
      </button>

      <!-- 删除选中 -->
      <template v-if="selectedCount">
        <div class="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          class="grid size-8 min-w-8 place-items-center rounded-lg text-danger transition hover:bg-accent-soft"
          :title="`删除选中的 ${selectedCount} 个节点`"
          aria-label="删除选中"
          @click="emit('deleteSelected')"
        >
          <AppIcon
            name="trash-2"
            :size="18"
          />
        </button>
      </template>

      <div class="mx-1 h-6 w-px bg-border" />

      <!-- 清空画布 -->
      <button
        type="button"
        class="grid size-8 min-w-8 place-items-center rounded-lg text-danger transition hover:bg-accent-soft"
        title="清空画布"
        aria-label="清空画布"
        @click="emit('clear')"
      >
        <AppIcon
          name="eraser"
          :size="18"
        />
      </button>
    </div>

    <!-- 外观弹层 -->
    <div
      v-if="appearanceOpen"
      class="pointer-events-auto absolute bottom-[72px] left-1/2 z-30 w-[248px] -translate-x-1/2 rounded-xl border border-border bg-surface/95 p-2.5 shadow-lift backdrop-blur"
      data-canvas-no-zoom
    >
      <div class="px-1 pb-2 text-sm font-medium text-fg/80">
        画布外观
      </div>
      <div class="px-1 pb-1.5 text-[11px] font-medium text-muted">
        网格样式
      </div>
      <div class="grid grid-cols-3 gap-1 rounded-lg bg-accent-soft/60 p-1">
        <button
          v-for="mode in backgroundModes"
          :key="mode.value"
          type="button"
          class="inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-sm transition"
          :class="backgroundMode === mode.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'"
          @click="emit('backgroundModeChange', mode.value)"
        >
          <AppIcon
            :name="mode.icon"
            :size="14"
          />
          {{ mode.label }}
        </button>
      </div>
      <div class="mt-3 flex items-center justify-between gap-3 rounded-lg px-1.5 py-1">
        <span class="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted">
          <AppIcon
            name="info"
            :size="14"
          />
          显示图片信息
        </span>
        <button
          type="button"
          role="switch"
          :aria-checked="showImageInfo"
          class="relative h-5 w-9 rounded-full transition"
          :class="showImageInfo ? 'bg-accent' : 'bg-border'"
          @click="emit('showImageInfoChange', !showImageInfo)"
        >
          <span
            class="absolute top-0.5 size-4 rounded-full bg-white transition-all"
            :class="showImageInfo ? 'left-[18px]' : 'left-0.5'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
