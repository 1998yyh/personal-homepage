<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-mini-map.tsx
// 改造点：主题色 → 设计令牌 / 内置节点色表（源项目走 node-registry 的 minimapColor）。
import { computed, ref } from 'vue';
import { CanvasNodeType, type CanvasNodeData, type ViewportTransform } from '../../../types/canvas';

const props = defineProps<{
  nodes: CanvasNodeData[];
  viewport: ViewportTransform;
  viewportSize: { width: number; height: number };
}>();

const emit = defineEmits<{
  viewportChange: [viewport: ViewportTransform];
}>();

const MAP_WIDTH = 240;
const MAP_HEIGHT = 160;
const BOUNDS_PADDING = 500;

// 内置节点类型的 minimap 颜色（源：builtin-nodes.tsx 的 minimapColor）
const NODE_COLORS: Record<string, string> = {
  [CanvasNodeType.Image]: '#10b981',
  [CanvasNodeType.Video]: '#f97316',
  [CanvasNodeType.Audio]: '#a855f7',
  [CanvasNodeType.Config]: '#60a5fa',
  [CanvasNodeType.Group]: '#94a3b8',
};
const FALLBACK_COLOR = 'var(--muted)';

const containerRef = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

const boundsState = computed(() => {
  if (!props.nodes.length) {
    return { worldBounds: { x: -BOUNDS_PADDING, y: -BOUNDS_PADDING, w: 1000, h: 1000 }, scale: 0.16, offset: { x: 40, y: 0 } };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  props.nodes.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + node.width);
    maxY = Math.max(maxY, node.position.y + node.height);
  });

  minX -= BOUNDS_PADDING;
  minY -= BOUNDS_PADDING;
  maxX += BOUNDS_PADDING;
  maxY += BOUNDS_PADDING;

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;
  const nextScale = Math.min(MAP_WIDTH / boundsWidth, MAP_HEIGHT / boundsHeight);

  return {
    worldBounds: { x: minX, y: minY, w: boundsWidth, h: boundsHeight },
    scale: nextScale,
    offset: { x: (MAP_WIDTH - boundsWidth * nextScale) / 2, y: (MAP_HEIGHT - boundsHeight * nextScale) / 2 },
  };
});

const worldBounds = computed(() => boundsState.value.worldBounds);
const scale = computed(() => boundsState.value.scale);
const offset = computed(() => boundsState.value.offset);

function toMinimap(worldX: number, worldY: number) {
  return {
    x: (worldX - worldBounds.value.x) * scale.value + offset.value.x,
    y: (worldY - worldBounds.value.y) * scale.value + offset.value.y,
  };
}

function toWorld(minimapX: number, minimapY: number) {
  return {
    x: (minimapX - offset.value.x) / scale.value + worldBounds.value.x,
    y: (minimapY - offset.value.y) / scale.value + worldBounds.value.y,
  };
}

const viewportRect = computed(() => {
  const vx = -props.viewport.x / props.viewport.k;
  const vy = -props.viewport.y / props.viewport.k;
  const vw = props.viewportSize.width / props.viewport.k;
  const vh = props.viewportSize.height / props.viewport.k;
  const p1 = toMinimap(vx, vy);
  const p2 = toMinimap(vx + vw, vy + vh);
  return {
    x: p1.x,
    y: p1.y,
    w: Math.max(p2.x - p1.x, 4),
    h: Math.max(p2.y - p1.y, 4),
  };
});

function updateViewportFromEvent(event: PointerEvent) {
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const world = toWorld(event.clientX - rect.left, event.clientY - rect.top);
  emit('viewportChange', {
    x: props.viewportSize.width / 2 - world.x * props.viewport.k,
    y: props.viewportSize.height / 2 - world.y * props.viewport.k,
    k: props.viewport.k,
  });
}

function handlePointerDown(event: PointerEvent) {
  event.preventDefault();
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  isDragging.value = true;
  updateViewportFromEvent(event);
}

function handlePointerMove(event: PointerEvent) {
  if (isDragging.value) updateViewportFromEvent(event);
}

function nodeColor(type: string) {
  return NODE_COLORS[type] || FALLBACK_COLOR;
}
</script>

<template>
  <div
    class="absolute bottom-24 left-6 z-50 overflow-hidden rounded-lg border border-border bg-surface/90 shadow-lift backdrop-blur-sm"
    :style="{ width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px` }"
    data-canvas-no-zoom
  >
    <div
      ref="containerRef"
      class="relative h-full w-full cursor-crosshair"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="isDragging = false"
      @pointerleave="isDragging = false"
    >
      <div
        v-for="node in nodes"
        :key="node.id"
        class="absolute rounded-[1px] opacity-80"
        :style="{
          left: `${toMinimap(node.position.x, node.position.y).x}px`,
          top: `${toMinimap(node.position.x, node.position.y).y}px`,
          width: `${Math.max(node.width * scale, 2)}px`,
          height: `${Math.max(node.height * scale, 2)}px`,
          backgroundColor: nodeColor(node.type),
        }"
      />
      <div
        class="pointer-events-none absolute border border-accent bg-accent/10"
        :style="{
          left: `${viewportRect.x}px`,
          top: `${viewportRect.y}px`,
          width: `${viewportRect.w}px`,
          height: `${viewportRect.h}px`,
        }"
      />
    </div>
  </div>
</template>
