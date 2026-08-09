// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/infinite-canvas.tsx 的 pan/zoom/Space 逻辑（React → composable 重写）
// 滚轮缩放（以光标为锚点）、中键/左键空白平移（rAF 合帧）、Space 键追踪
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import type { ViewportTransform } from '../../../types/canvas';

const MIN_SCALE = 0.05;
const MAX_SCALE = 5;
/** 平移超过 3px 才算拖动，否则视为点击（触发取消选区） */
const PAN_CLICK_THRESHOLD = 3;

export function useCanvasViewport(options: {
  containerRef: Ref<HTMLDivElement | null>;
  viewport: Ref<ViewportTransform>;
  onViewportChange: (viewport: ViewportTransform) => void;
  /** Ctrl/Cmd + 左键空白：框选入口（交给 useMarqueeSelection） */
  onCanvasMouseDown?: (event: PointerEvent) => void;
  /** 平移未移动（纯点击空白）：取消选区 */
  onCanvasDeselect?: () => void;
}) {
  const isSpacePressed = ref(false);
  const panState = {
    isPanning: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
  };
  let frameId: number | null = null;
  let nextViewport: ViewportTransform | null = null;

  function handleWheel(event: WheelEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-canvas-no-zoom],.od-modal-overlay,.od-drawer')) return;

    const viewport = options.viewport.value;
    const factor = Math.pow(1.1, -event.deltaY / 100);
    const newScale = Math.min(Math.max(viewport.k * factor, MIN_SCALE), MAX_SCALE);
    const rect = options.containerRef.value?.getBoundingClientRect();
    if (!rect) return;

    // 以光标为锚点：缩放前后光标下的世界点不动
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const worldX = (mouseX - viewport.x) / viewport.k;
    const worldY = (mouseY - viewport.y) / viewport.k;

    options.onViewportChange({
      x: mouseX - worldX * newScale,
      y: mouseY - worldY * newScale,
      k: newScale,
    });
  }

  function handlePointerDown(event: PointerEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-canvas-no-zoom]')) return;
    if (target?.closest('[data-connection-create-menu]')) return;
    const isBackgroundClick = !target?.closest('[data-node-id],[data-connection-id]');
    const container = options.containerRef.value;
    if (!container) return;

    if (event.button === 0 && (event.ctrlKey || event.metaKey) && isBackgroundClick) {
      event.preventDefault();
      container.setPointerCapture?.(event.pointerId);
      options.onCanvasMouseDown?.(event);
      return;
    }

    if (event.button === 1 || (event.button === 0 && !isSpacePressed.value && isBackgroundClick)) {
      event.preventDefault();
      container.setPointerCapture?.(event.pointerId);
      panState.isPanning = true;
      panState.startX = event.clientX;
      panState.startY = event.clientY;
      panState.initialX = options.viewport.value.x;
      panState.initialY = options.viewport.value.y;
      panState.hasMoved = false;
      document.body.style.cursor = 'grabbing';
      return;
    }

    if (event.button === 0 && isSpacePressed.value && isBackgroundClick) {
      event.preventDefault();
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (!panState.isPanning) return;
    const dx = event.clientX - panState.startX;
    const dy = event.clientY - panState.startY;
    if (Math.abs(dx) > PAN_CLICK_THRESHOLD || Math.abs(dy) > PAN_CLICK_THRESHOLD) {
      panState.hasMoved = true;
    }
    nextViewport = {
      x: panState.initialX + dx,
      y: panState.initialY + dy,
      k: options.viewport.value.k,
    };
    if (frameId) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      if (nextViewport) options.onViewportChange(nextViewport);
    });
  }

  function handlePointerUp() {
    if (!panState.isPanning) return;
    if (!panState.hasMoved) options.onCanvasDeselect?.();
    panState.isPanning = false;
    document.body.style.cursor = '';
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.code !== 'Space') return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    isSpacePressed.value = true;
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') isSpacePressed.value = false;
  }

  // 阻止画布滚轮带动页面滚动，同时保留浮层内的原生滚动
  function preventWheelScroll(event: WheelEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-canvas-no-zoom],.od-modal-overlay,.od-drawer')) return;
    event.preventDefault();
  }

  onMounted(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    options.containerRef.value?.addEventListener('wheel', preventWheelScroll, { passive: false });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    options.containerRef.value?.removeEventListener('wheel', preventWheelScroll);
    if (frameId) cancelAnimationFrame(frameId);
    if (panState.isPanning) document.body.style.cursor = '';
  });

  return { isSpacePressed, handleWheel, handlePointerDown };
}
