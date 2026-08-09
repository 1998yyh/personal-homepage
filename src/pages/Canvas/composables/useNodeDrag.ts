// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/pages/canvas/project.tsx 的节点选中/拖拽段（selectNodeByEvent、handleNodeSelectCapture、
// handleNodeMouseDown、handleGlobalMouseMove、finishNodeDrag）
// 要点：capture 阶段先选中（缓存 pendingSelection 避免重复切换），bubbling 阶段只启动拖拽；
// 拖拽全程 pauseHistory，结束一次 resumeHistory → 整段手势合并为一步撤销；
// 批次根拖动级联子图、分组拖动级联组内节点、结束时经 store.finishNodeMove 做分组吸附。
import { onBeforeUnmount, onMounted } from 'vue';
import { CanvasNodeType } from '../../../types/canvas';
import { findGroupDropTarget } from '../../../lib/canvas/canvas-node-geometry';
import { useCanvasStore } from '../../../stores/canvas';

/** 位移超过 3px 才算拖拽，否则按点击处理 */
const DRAG_CLICK_THRESHOLD = 3;

type DragState = {
  isDraggingNode: boolean;
  hasMoved: boolean;
  startX: number;
  startY: number;
  initialSelectedNodes: { id: string; x: number; y: number }[];
};

export function useNodeDrag() {
  const store = useCanvasStore();
  const dragState: DragState = {
    isDraggingNode: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    initialSelectedNodes: [],
  };
  let rafId: number | null = null;
  let pendingSelection: Set<string> | null = null;

  /** Shift/Ctrl/Cmd 切换选中，普通点击单选；与源实现逐行对应 */
  function selectNodeByEvent(event: Pick<MouseEvent, 'shiftKey' | 'metaKey' | 'ctrlKey'>, nodeId: string) {
    const nextSelected = new Set(store.selectedNodeIds);
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      if (nextSelected.has(nodeId)) nextSelected.delete(nodeId);
      else nextSelected.add(nodeId);
    } else if (!nextSelected.has(nodeId)) {
      nextSelected.clear();
      nextSelected.add(nodeId);
    }
    store.setSelectedNodeIds(nextSelected);
    return nextSelected;
  }

  /** capture 阶段选中：节点内任何元素（含 textarea）按下都先选中节点 */
  function handleNodeSelectCapture(event: MouseEvent, nodeId: string) {
    if (event.button !== 0) return;
    store.contextMenu = null;
    store.hoveredNodeId = null;
    store.selectedConnectionId = null;
    pendingSelection = selectNodeByEvent(event, nodeId);
  }

  /** bubbling 阶段启动拖拽（capture 已选中；兜底再选一次） */
  function handleNodeMouseDown(event: MouseEvent, nodeId: string) {
    event.stopPropagation();
    const currentNodes = store.nodes;
    const nextSelected = pendingSelection ?? selectNodeByEvent(event, nodeId);
    pendingSelection = null;

    // 拖批次根带上全部子图；拖分组带上组内全部节点
    const dragIds = new Set(nextSelected);
    currentNodes.forEach((node) => {
      if (!nextSelected.has(node.id)) return;
      node.metadata?.batchChildIds?.forEach((childId) => dragIds.add(childId));
      if (node.type === CanvasNodeType.Group) {
        currentNodes.forEach((child) => {
          if (child.metadata?.groupId === node.id) dragIds.add(child.id);
        });
      }
    });

    dragState.isDraggingNode = true;
    dragState.hasMoved = false;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.initialSelectedNodes = currentNodes
      .filter((node) => dragIds.has(node.id))
      .map((node) => ({ id: node.id, x: node.position.x, y: node.position.y }));
    store.pauseHistory();
    store.isNodeDragging = true;
  }

  function movedPositions(clientX: number, clientY: number) {
    const k = store.viewport.k;
    const dx = (clientX - dragState.startX) / k;
    const dy = (clientY - dragState.startY) / k;
    return { dx, dy };
  }

  function handleGlobalMouseMove(event: MouseEvent) {
    if (!dragState.isDraggingNode) return;
    const { dx, dy } = movedPositions(event.clientX, event.clientY);
    if (Math.abs(event.clientX - dragState.startX) > DRAG_CLICK_THRESHOLD || Math.abs(event.clientY - dragState.startY) > DRAG_CLICK_THRESHOLD) {
      dragState.hasMoved = true;
    }
    const initialPositions = dragState.initialSelectedNodes;
    const previewNodes = store.nodes.map((node) => {
      const initial = initialPositions.find((item) => item.id === node.id);
      return initial ? { ...node, position: { x: initial.x + dx, y: initial.y + dy } } : node;
    });
    // 分组吸附预览高亮
    const movedIds = new Set(initialPositions.map((item) => item.id));
    store.dropTargetGroupId = findGroupDropTarget(movedIds, previewNodes)?.id || null;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      store.applyLocal({
        nodes: store.nodes.map((node) => {
          const initial = initialPositions.find((item) => item.id === node.id);
          return initial ? { ...node, position: { x: initial.x + dx, y: initial.y + dy } } : node;
        }),
      });
    });
  }

  function finishNodeDrag(clientX?: number, clientY?: number) {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (!dragState.isDraggingNode) return;

    const hasMoved = dragState.hasMoved && clientX != null && clientY != null;
    const initialPositions = dragState.initialSelectedNodes;

    store.isNodeDragging = false;
    store.dropTargetGroupId = null;
    store.resumeHistory();

    if (hasMoved) {
      const { dx, dy } = movedPositions(clientX, clientY);
      const movedNodes = store.nodes.map((node) => {
        const initial = initialPositions.find((item) => item.id === node.id);
        return initial ? { ...node, position: { x: initial.x + dx, y: initial.y + dy } } : node;
      });
      const movedIds = new Set(initialPositions.map((item) => item.id));
      store.finishNodeMove(movedIds, movedNodes);
    }

    dragState.isDraggingNode = false;
    dragState.hasMoved = false;
    dragState.initialSelectedNodes = [];
  }

  function handleGlobalMouseUp(event: MouseEvent) {
    finishNodeDrag(event.clientX, event.clientY);
  }

  function handleGlobalPointerUp(event: PointerEvent) {
    finishNodeDrag(event.clientX, event.clientY);
  }

  function cancelNodeDrag() {
    finishNodeDrag();
  }

  onMounted(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', cancelNodeDrag);
    window.addEventListener('blur', cancelNodeDrag);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
    window.removeEventListener('pointerup', handleGlobalPointerUp);
    window.removeEventListener('pointercancel', cancelNodeDrag);
    window.removeEventListener('blur', cancelNodeDrag);
    if (rafId) cancelAnimationFrame(rafId);
  });

  return { handleNodeMouseDown, handleNodeSelectCapture };
}
