// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/pages/canvas/project.tsx 的 handleKeyDown 段
// Delete/Backspace 删节点或连线、Ctrl+Z/Y 撤销重做、Ctrl+A 全选、Ctrl+C/V 内部剪贴板、Esc 清空交互态。
// 输入控件/浮层内不响应；页面有文本选区时 Ctrl+C 让位给系统复制。
import { onBeforeUnmount, onMounted } from 'vue';
import { useCanvasStore } from '../../../stores/canvas';
import type { GetCanvasCenter } from './types';

export function useCanvasKeyboard(options: {
  getCanvasCenter: GetCanvasCenter;
  /** 内部剪贴板为空时的系统剪贴板回退（图片/纯文本 → 新节点），由编辑器页实现 */
  pasteSystemClipboard: () => void | Promise<void>;
}) {
  const store = useCanvasStore();

  function handleKeyDown(event: KeyboardEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      target?.closest("[contenteditable='true'],[data-canvas-no-zoom],[data-canvas-shortcuts-ignore]")
    )
      return;

    const key = event.key.toLowerCase();
    const isModifierShortcut = event.metaKey || event.ctrlKey;

    if (isModifierShortcut && key === 'c' && window.getSelection()?.toString()) return;

    if (isModifierShortcut && !event.altKey && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) store.redo();
      else store.undo();
      return;
    }

    if (isModifierShortcut && !event.altKey && key === 'y') {
      event.preventDefault();
      store.redo();
      return;
    }

    if (isModifierShortcut && !event.altKey && key === 'a') {
      event.preventDefault();
      store.setSelectedNodeIds(new Set(store.nodes.map((node) => node.id)));
      store.selectedConnectionId = null;
      store.contextMenu = null;
      store.selectionBox = null;
      return;
    }

    if (isModifierShortcut && !event.altKey && key === 'c') {
      event.preventDefault();
      store.copySelectedNodes();
      return;
    }

    if (isModifierShortcut && !event.altKey && key === 'v') {
      event.preventDefault();
      if (!store.pasteCopiedNodes(options.getCanvasCenter())) void options.pasteSystemClipboard();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (store.selectedNodeIds.size) {
        store.deleteNodes(new Set(store.selectedNodeIds));
      } else if (store.selectedConnectionId) {
        store.deleteConnection(store.selectedConnectionId);
      }
      return;
    }

    if (event.key === 'Escape') {
      store.deselectAll();
      store.connecting = null;
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}
