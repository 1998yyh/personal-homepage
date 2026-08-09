// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/pages/canvas/project.tsx 的框选段（handleCanvasMouseDown + handleGlobalPointerMove）
// Ctrl/Cmd + 左键空白拖出选框，与节点求交实时更新选区；Shift 追加到已有选区。
import { onBeforeUnmount, onMounted } from 'vue';
import { isHiddenBatchChild } from '../../../lib/canvas/canvas-node-geometry';
import { useCanvasStore } from '../../../stores/canvas';
import type { ScreenToCanvas } from './types';

export function useMarqueeSelection(options: { screenToCanvas: ScreenToCanvas }) {
  const store = useCanvasStore();

  /** 由 InfiniteCanvas 的空白 Ctrl+左键回调触发 */
  function startMarquee(event: PointerEvent) {
    store.contextMenu = null;
    if (event.button !== 0) return;

    if (!event.ctrlKey && !event.metaKey) {
      store.selectionBox = null;
      store.setSelectedNodeIds(new Set());
      store.selectedConnectionId = null;
      return;
    }

    const world = options.screenToCanvas(event.clientX, event.clientY);
    store.selectionBox = {
      startWorldX: world.x,
      startWorldY: world.y,
      currentWorldX: world.x,
      currentWorldY: world.y,
      additive: event.shiftKey,
      initialSelectedNodeIds: event.shiftKey ? Array.from(store.selectedNodeIds) : [],
    };
    if (!event.shiftKey) {
      store.setSelectedNodeIds(new Set());
    }
    store.selectedConnectionId = null;
  }

  function handleGlobalPointerMove(event: PointerEvent) {
    const currentSelection = store.selectionBox;
    if (!currentSelection) return;

    if (event.buttons === 0) {
      store.selectionBox = null;
      return;
    }

    const world = options.screenToCanvas(event.clientX, event.clientY);
    const rectX = Math.min(currentSelection.startWorldX, world.x);
    const rectY = Math.min(currentSelection.startWorldY, world.y);
    const rectW = Math.abs(world.x - currentSelection.startWorldX);
    const rectH = Math.abs(world.y - currentSelection.startWorldY);
    const nextSelected = new Set<string>(currentSelection.additive ? currentSelection.initialSelectedNodeIds : []);

    store.nodes
      .filter((node) => !isHiddenBatchChild(node, store.nodes))
      .forEach((node) => {
        const intersects =
          rectX < node.position.x + node.width &&
          rectX + rectW > node.position.x &&
          rectY < node.position.y + node.height &&
          rectY + rectH > node.position.y;
        if (intersects) nextSelected.add(node.id);
      });

    store.selectionBox = { ...currentSelection, currentWorldX: world.x, currentWorldY: world.y };
    store.setSelectedNodeIds(nextSelected);
  }

  function handleGlobalPointerUp() {
    store.selectionBox = null;
  }

  onMounted(() => {
    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', handleGlobalPointerUp);
  });

  return { startMarquee };
}
