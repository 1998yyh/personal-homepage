// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-node.tsx 的四角 ResizeHandle 逻辑
// 要点：min 220x160；图片（非 freeResize）/视频锁定宽高比；左/上角拖拽同时改 position；
// keepRatio 时以主导轴为准并回夹最小尺寸。拖拽全程 pauseHistory（由调用方在 start/end 配对）。
import { onBeforeUnmount } from 'vue';
import { CanvasNodeType, type CanvasNodeData, type Position } from '../../../types/canvas';
import { useCanvasStore } from '../../../stores/canvas';

export type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const MIN_WIDTH = 220;
const MIN_HEIGHT = 160;

type ResizeState = {
  isResizing: boolean;
  corner: ResizeCorner;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
  keepRatio: boolean;
  ratio: number;
};

export function useNodeResize() {
  const store = useCanvasStore();
  const resizeState: ResizeState = {
    isResizing: false,
    corner: 'bottom-right',
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    startWidth: 0,
    startHeight: 0,
    keepRatio: false,
    ratio: 1,
  };
  let resizingNodeId: string | null = null;

  function handleResizeMove(event: MouseEvent) {
    if (!resizeState.isResizing || !resizingNodeId) return;
    const nodeId = resizingNodeId;
    const scale = store.viewport.k;
    const dx = (event.clientX - resizeState.startX) / scale;
    const dy = (event.clientY - resizeState.startY) / scale;
    const startRight = resizeState.startLeft + resizeState.startWidth;
    const startBottom = resizeState.startTop + resizeState.startHeight;
    const fromLeft = resizeState.corner.includes('left');
    const fromTop = resizeState.corner.includes('top');
    const rawWidth = Math.max(MIN_WIDTH, resizeState.startWidth + (fromLeft ? -dx : dx));
    const rawHeight = Math.max(MIN_HEIGHT, resizeState.startHeight + (fromTop ? -dy : dy));
    let width = rawWidth;
    let height = rawHeight;
    if (resizeState.keepRatio) {
      const ratio = resizeState.ratio;
      if (Math.abs(dx) >= Math.abs(dy)) {
        height = width / ratio;
      } else {
        width = height * ratio;
      }
      if (height < MIN_HEIGHT) {
        height = MIN_HEIGHT;
        width = height * ratio;
      }
      if (width < MIN_WIDTH) {
        width = MIN_WIDTH;
        height = width / ratio;
      }
    }

    const position: Position = {
      x: fromLeft ? startRight - width : resizeState.startLeft,
      y: fromTop ? startBottom - height : resizeState.startTop,
    };
    store.updateNode(nodeId, (node) => ({ ...node, width, height, position }));
  }

  function handleResizeUp() {
    if (!resizeState.isResizing) return;
    resizeState.isResizing = false;
    resizingNodeId = null;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeUp);
    store.isNodeResizing = false;
    store.resumeHistory();
  }

  function handleResizeMouseDown(event: MouseEvent, node: CanvasNodeData, corner: ResizeCorner) {
    event.stopPropagation();
    event.preventDefault();
    store.pauseHistory();
    store.isNodeResizing = true;
    resizingNodeId = node.id;
    resizeState.isResizing = true;
    resizeState.corner = corner;
    resizeState.startX = event.clientX;
    resizeState.startY = event.clientY;
    resizeState.startLeft = node.position.x;
    resizeState.startTop = node.position.y;
    resizeState.startWidth = node.width;
    resizeState.startHeight = node.height;
    resizeState.keepRatio =
      (node.type === CanvasNodeType.Image && !node.metadata?.freeResize) || node.type === CanvasNodeType.Video;
    resizeState.ratio = (node.metadata?.naturalWidth || node.width) / (node.metadata?.naturalHeight || node.height || 1);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeUp);
  }

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeUp);
    if (resizeState.isResizing) {
      store.isNodeResizing = false;
      store.resumeHistory();
    }
  });

  return { handleResizeMouseDown };
}
