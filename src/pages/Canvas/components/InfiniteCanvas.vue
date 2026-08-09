<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/infinite-canvas.tsx + CanvasGrid
// 视口容器：CSS transform 世界 div（origin-top-left）+ CSS 网格背景（点/线/空白）。
// pan/zoom/Space 逻辑在 useCanvasViewport，事件通过 emit 交给编辑器页。
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '../../../stores/canvas';
import { useCanvasViewport } from '../composables/useCanvasViewport';

const store = useCanvasStore();
const { viewport } = storeToRefs(store);

const emit = defineEmits<{
  /** Ctrl/Cmd + 左键空白（框选入口） */
  canvasMouseDown: [event: PointerEvent];
  /** 纯点击空白（未平移）：取消选区 */
  canvasDeselect: [];
  /** 双击空白：打开节点创建菜单 */
  canvasDoubleClick: [event: MouseEvent];
  /** 空白右键：阻止默认菜单 */
  canvasContextMenu: [event: MouseEvent];
  /** 拖文件落入画布 */
  canvasDrop: [event: DragEvent];
}>();

const containerRef = ref<HTMLDivElement | null>(null);

const { handleWheel, handlePointerDown } = useCanvasViewport({
  containerRef,
  viewport,
  onViewportChange: (next) => {
    store.setViewport(next);
    store.contextMenu = null;
  },
  onCanvasMouseDown: (event) => emit('canvasMouseDown', event),
  onCanvasDeselect: () => emit('canvasDeselect'),
});

function handleDoubleClick(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('[data-canvas-no-zoom],[data-node-id],[data-connection-id]')) return;
  emit('canvasDoubleClick', event);
}

// CSS 网格背景：随视口缩放/平移（颜色走设计令牌，亮暗主题自动适配）
const gridStyle = computed(() => {
  const { x, y, k } = store.viewport;
  const gridSize = 48 * k;
  const dotSize = k < 0.12 ? 0.8 : 1.15;
  const backgroundImage =
    store.backgroundMode === 'dots'
      ? `radial-gradient(circle, var(--border) ${dotSize}px, transparent ${dotSize + 0.2}px)`
      : 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)';
  return {
    backgroundImage,
    backgroundSize: `${gridSize}px ${gridSize}px`,
    backgroundPosition: `${x % gridSize}px ${y % gridSize}px`,
  };
});

const worldStyle = computed(() => ({
  transform: `translate(${store.viewport.x}px, ${store.viewport.y}px) scale(${store.viewport.k})`,
}));

defineExpose({ containerRef });
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full w-full cursor-grab select-none overflow-hidden bg-bg"
    @pointerdown="handlePointerDown"
    @dblclick="handleDoubleClick"
    @wheel="handleWheel"
    @contextmenu="(event) => emit('canvasContextMenu', event)"
    @dragover.prevent
    @drop="(event) => emit('canvasDrop', event)"
  >
    <div
      v-if="store.backgroundMode !== 'blank'"
      class="pointer-events-none absolute inset-0 opacity-40"
      :style="gridStyle"
    />
    <div
      class="absolute origin-top-left"
      :style="worldStyle"
    >
      <slot />
    </div>
  </div>
</template>
