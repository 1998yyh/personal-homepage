<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-connections.tsx（ConnectionPath + ActiveConnectionPath）
// SVG 三次贝塞尔连线：曲率 max(|dx|*0.5, 50)；宽透明 path 承担点击/右键命中，细 path 纯展示。
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '../../../stores/canvas';
import { isHiddenBatchConnectionEndpoint } from '../../../lib/canvas/canvas-node-geometry';
import type { CanvasConnection, CanvasNodeData } from '../../../types/canvas';

const props = defineProps<{
  /** 关联高亮（悬停/选中节点的相关连线 id 集合） */
  relatedConnectionIds: Set<string>;
}>();

const emit = defineEmits<{
  select: [connectionId: string];
  contextMenu: [event: MouseEvent, connectionId: string];
}>();

const store = useCanvasStore();
const { connections, nodes, nodeById, selectedConnectionId, connecting, connectionTargetNodeId, mouseWorld } = storeToRefs(store);

const SELECTION_BLUE = '#2f80ff';

function connectionPath(from: CanvasNodeData, to: CanvasNodeData) {
  const startX = from.position.x + from.width;
  const startY = from.position.y + from.height / 2;
  const endX = to.position.x;
  const endY = to.position.y + to.height / 2;
  const dx = Math.abs(endX - startX);
  const curvature = Math.max(dx * 0.5, 50);
  return `M ${startX} ${startY} C ${startX + curvature} ${startY}, ${endX - curvature} ${endY}, ${endX} ${endY}`;
}

const visibleConnections = computed(() =>
  connections.value
    .map((connection) => {
      const from = nodeById.value.get(connection.fromNodeId);
      const to = nodeById.value.get(connection.toNodeId);
      if (!from || !to) return null;
      if (isHiddenBatchConnectionEndpoint(from, nodes.value) || isHiddenBatchConnectionEndpoint(to, nodes.value)) return null;
      // path 字符串在此缓存：父组件高频重渲染（拖拽/缩放）时不再逐条重算
      return { connection, from, to, d: connectionPath(from, to) };
    })
    .filter((item): item is { connection: CanvasConnection; from: CanvasNodeData; to: CanvasNodeData; d: string } => item !== null),
);

function isActive(connectionId: string) {
  return selectedConnectionId.value === connectionId || props.relatedConnectionIds.has(connectionId);
}

// 拖拽中的临时连线：source 从右缘出发 / target 从左缘出发，吸附目标节点边缘
const activePathD = computed(() => {
  const current = connecting.value;
  if (!current) return null;
  const node = nodeById.value.get(current.nodeId);
  if (!node) return null;
  const target = connectionTargetNodeId.value ? nodeById.value.get(connectionTargetNodeId.value) : undefined;
  const mouse = mouseWorld.value;

  const startX = current.handleType === 'source' ? node.position.x + node.width : mouse.x;
  const startY = current.handleType === 'source' ? node.position.y + node.height / 2 : mouse.y;
  const endX = current.handleType === 'source' ? mouse.x : node.position.x;
  const endY = current.handleType === 'source' ? mouse.y : node.position.y + node.height / 2;
  const snappedStartX = current.handleType === 'target' && target ? target.position.x + target.width : startX;
  const snappedStartY = current.handleType === 'target' && target ? target.position.y + target.height / 2 : startY;
  const snappedEndX = current.handleType === 'source' && target ? target.position.x : endX;
  const snappedEndY = current.handleType === 'source' && target ? target.position.y + target.height / 2 : endY;
  const distance = Math.abs(snappedEndX - snappedStartX);
  return `M ${snappedStartX} ${snappedStartY} C ${snappedStartX + distance * 0.5} ${snappedStartY}, ${snappedEndX - distance * 0.5} ${snappedEndY}, ${snappedEndX} ${snappedEndY}`;
});

function handleSelect(connectionId: string) {
  emit('select', connectionId);
}

function handleContextMenu(event: MouseEvent, connectionId: string) {
  event.preventDefault();
  event.stopPropagation();
  emit('contextMenu', event, connectionId);
}
</script>

<template>
  <svg
    class="absolute left-0 top-0 h-[10000px] w-[10000px] overflow-visible"
    style="pointer-events: none; transform: translateZ(0); z-index: 0"
  >
    <g
      v-for="{ connection, d } in visibleConnections"
      :key="connection.id"
    >
      <path
        :data-connection-id="connection.id"
        :d="d"
        stroke="transparent"
        stroke-width="16"
        fill="none"
        style="cursor: pointer; pointer-events: stroke"
        @click.stop="handleSelect(connection.id)"
        @contextmenu="(event) => handleContextMenu(event, connection.id)"
      />
      <path
        :d="d"
        :stroke="isActive(connection.id) ? SELECTION_BLUE : 'var(--muted)'"
        :stroke-width="isActive(connection.id) ? 3 : 2"
        :stroke-opacity="isActive(connection.id) ? 1 : 0.82"
        fill="none"
        :style="{
          filter: isActive(connection.id) ? `drop-shadow(0 0 8px ${SELECTION_BLUE}66)` : undefined,
          pointerEvents: 'none',
        }"
      />
    </g>
    <path
      v-if="activePathD"
      :d="activePathD"
      :stroke="SELECTION_BLUE"
      stroke-width="2"
      fill="none"
      stroke-dasharray="5,5"
    />
  </svg>
</template>
