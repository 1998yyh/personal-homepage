<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/pages/canvas/project.tsx（3044 行）的交互半
// 画布编辑器编排页：文档态在 stores/canvas.ts，交互逻辑在 composables/，
// 本页只负责坐标换算、容器尺寸、上传/粘贴落点、菜单与弹层编排。
// AI 生成胶水（retry/prompt panel/裁剪等）属 Phase 4，不在本页。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '../../stores/canvas';
import { mediaApi, mediaUrl } from '../../lib/media-api';
import { fitNodeSize } from '../../lib/canvas/canvas-node-size';
import { audioMetadata, imageMetadata, NODE_DEFAULT_SIZE, videoMetadata } from '../../lib/canvas/canvas-node-factory';
import { isHiddenBatchChild } from '../../lib/canvas/canvas-node-geometry';
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeTypeId, type Position } from '../../types/canvas';
import { useNodeDrag } from './composables/useNodeDrag';
import { useMarqueeSelection } from './composables/useMarqueeSelection';
import { useConnectionDrag } from './composables/useConnectionDrag';
import { useCanvasKeyboard } from './composables/useCanvasKeyboard';
import { useGenerationTaskWatcher } from './composables/useGenerationTaskWatcher';
import InfiniteCanvas from './components/InfiniteCanvas.vue';
import CanvasConnections from './components/CanvasConnections.vue';
import CanvasNode from './components/CanvasNode.vue';
import CanvasToolbar from './components/CanvasToolbar.vue';
import CanvasZoomControls from './components/CanvasZoomControls.vue';
import CanvasContextMenu from './components/CanvasContextMenu.vue';
import CanvasCreateMenu from './components/CanvasCreateMenu.vue';
import CanvasMiniMap from './components/CanvasMiniMap.vue';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal.vue';
import AppIcon from '../../components/AppIcon.vue';
import { exportCanvasNodes, exportCanvasProject } from '../../lib/canvas/canvas-export';

const VIDEO_NODE_MAX_WIDTH = 420;
const VIDEO_NODE_MAX_HEIGHT = 420;
const CULL_PADDING = 280;

const route = useRoute();
const router = useRouter();
const store = useCanvasStore();
const {
  nodes,
  viewport,
  selectedNodeIds,
  hoveredNodeId,
  selectionBox,
  contextMenu,
  dropTargetGroupId,
  conflict,
  dirty,
  saving,
  loaded,
  loadError,
} = storeToRefs(store);

// ── 容器与坐标换算 ────────────────────────────────────────────
const infiniteCanvasRef = ref<InstanceType<typeof InfiniteCanvas> | null>(null);
const containerEl = computed(() => infiniteCanvasRef.value?.containerRef ?? null);
const size = ref({ width: 1200, height: 720 });
let resizeObserver: ResizeObserver | null = null;

function screenToCanvas(clientX: number, clientY: number) {
  const rect = containerEl.value?.getBoundingClientRect();
  const current = viewport.value;
  return {
    x: (clientX - (rect?.left || 0) - current.x) / current.k,
    y: (clientY - (rect?.top || 0) - current.y) / current.k,
  };
}

function getCanvasCenter() {
  const rect = containerEl.value?.getBoundingClientRect();
  return screenToCanvas((rect?.left || 0) + (rect?.width || size.value.width) / 2, (rect?.top || 0) + (rect?.height || size.value.height) / 2);
}

// ── 加载 / 卸载 ───────────────────────────────────────────────
const projectId = computed(() => String(route.params.id || ''));
const needsCenter = ref(false);

watch(
  projectId,
  async (id, oldId) => {
    if (!id) {
      router.replace('/canvas');
      return;
    }
    // 从其他画布直接导航过来（同组件实例内路由参数变化）：先把旧项目未保存的修改落库
    if (oldId && oldId !== id) {
      await store.saveNow();
    }
    try {
      const { restoredViewport } = await store.load(id);
      needsCenter.value = !restoredViewport;
      centerIfNeeded();
      store.startVersionPolling();
    } catch {
      // loadError 已在 store，页面显示错误态
    }
  },
  { immediate: true },
);

function centerIfNeeded() {
  if (!needsCenter.value) return;
  const el = containerEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (!rect.width) return;
  store.setViewport({ x: rect.width / 2, y: rect.height / 2, k: 1 });
  needsCenter.value = false;
}

onMounted(async () => {
  await nextTick();
  const el = containerEl.value;
  if (!el) return;
  const updateSize = () => {
    const rect = el.getBoundingClientRect();
    size.value = { width: rect.width, height: rect.height };
    centerIfNeeded();
  };
  updateSize();
  resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(el);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  store.stopVersionPolling();
  void store.saveNow();
  store.unload();
});

// ── 交互 composables ─────────────────────────────────────────
const { handleNodeMouseDown, handleNodeSelectCapture } = useNodeDrag();
const { startMarquee } = useMarqueeSelection({ screenToCanvas });
const { pendingConnectionCreate, handleConnectStart, cancelPendingConnectionCreate } = useConnectionDrag({ screenToCanvas });
useCanvasKeyboard({ getCanvasCenter, pasteSystemClipboard });
// 异步生成任务（视频）轮询：终态时整文档静默重载
useGenerationTaskWatcher();

// ── 节点创建 ──────────────────────────────────────────────────
const nodeCreatePosition = ref<Position | null>(null);

function createNode(type: CanvasNodeTypeId, position?: Position) {
  store.addNode(type, position || getCanvasCenter());
}

function createConnectedNode(type: CanvasNodeTypeId) {
  const pending = pendingConnectionCreate.value;
  if (!pending) return;
  const node = store.addNode(type, pending.position);
  store.connectNodes(pending.connection, node.id);
  cancelPendingConnectionCreate();
}

function handleCanvasDoubleClick(event: MouseEvent) {
  store.contextMenu = null;
  nodeCreatePosition.value = screenToCanvas(event.clientX, event.clientY);
}

function handleNodeCreateMenuSelect(type: CanvasNodeTypeId) {
  if (!nodeCreatePosition.value) return;
  createNode(type, nodeCreatePosition.value);
  nodeCreatePosition.value = null;
}

function preventCanvasContextMenu(event: MouseEvent) {
  event.preventDefault();
}

function handleNodeHoverEnd(nodeId: string) {
  if (store.hoveredNodeId === nodeId) store.hoveredNodeId = null;
}

function handleCanvasMouseDown(event: PointerEvent) {
  store.contextMenu = null;
  nodeCreatePosition.value = null;
  if (pendingConnectionCreate.value) cancelPendingConnectionCreate();
  startMarquee(event);
}

function handleCanvasDeselect() {
  cancelPendingConnectionCreate();
  store.deselectAll();
}

// ── 视口控制 ──────────────────────────────────────────────────
function setZoomScale(scale: number) {
  const nextScale = Math.min(Math.max(scale, 0.05), 5);
  const prev = viewport.value;
  store.setViewport({
    x: size.value.width / 2 - ((size.value.width / 2 - prev.x) / prev.k) * nextScale,
    y: size.value.height / 2 - ((size.value.height / 2 - prev.y) / prev.k) * nextScale,
    k: nextScale,
  });
  store.contextMenu = null;
}

function resetViewport() {
  store.setViewport({ x: size.value.width / 2, y: size.value.height / 2, k: 1 });
  store.contextMenu = null;
}

// ── 上传（图片/视频/音频 → POST /media → 新节点） ─────────────
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadPositionRef = ref<Position | null>(null);
const uploadTargetNodeId = ref<string | null>(null);
const uploading = ref(false);

function handleUploadRequest(position?: Position, nodeId?: string) {
  uploadPositionRef.value = position || null;
  uploadTargetNodeId.value = nodeId || null;
  fileInputRef.value?.click();
}

function isAudioFile(file: File) {
  return file.type.startsWith('audio/') || /\.(mp3|wav)$/i.test(file.name);
}

async function createMediaNode(file: File, position: Position) {
  const media = await mediaApi.upload(file);
  let node: CanvasNodeData;
  if (isAudioFile(file)) {
    const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
    node = {
      id: `audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: CanvasNodeType.Audio,
      title: file.name,
      position: { x: position.x - spec.width / 2, y: position.y - spec.height / 2 },
      width: spec.width,
      height: spec.height,
      metadata: audioMetadata(media),
    };
  } else if (file.type.startsWith('video/')) {
    const fitted = fitNodeSize(media.width || 1280, media.height || 720, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
    node = {
      id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: CanvasNodeType.Video,
      title: file.name,
      position: { x: position.x - fitted.width / 2, y: position.y - fitted.height / 2 },
      width: fitted.width,
      height: fitted.height,
      metadata: videoMetadata(media),
    };
  } else {
    const fitted = fitNodeSize(media.width || 640, media.height || 480);
    node = {
      id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: CanvasNodeType.Image,
      title: file.name,
      position: { x: position.x - fitted.width / 2, y: position.y - fitted.height / 2 },
      width: fitted.width,
      height: fitted.height,
      metadata: imageMetadata(media),
    };
  }
  store.applyLocal({ nodes: [...nodes.value, node] });
  store.setSelectedNodeIds(new Set([node.id]));
  store.selectedConnectionId = null;
}

const uploadError = ref('');

/** 用上传的媒体替换目标节点（保持节点 id，类型/尺寸/元数据按新文件改写） */
async function replaceNodeWithFile(nodeId: string, file: File) {
  const target = nodes.value.find((n) => n.id === nodeId);
  if (!target) return;
  const media = await mediaApi.upload(file);
  if (isAudioFile(file)) {
    const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
    store.updateNode(nodeId, (node) => ({
      ...node,
      type: CanvasNodeType.Audio,
      title: file.name,
      position: {
        x: node.position.x + node.width / 2 - spec.width / 2,
        y: node.position.y + node.height / 2 - spec.height / 2,
      },
      width: spec.width,
      height: spec.height,
      metadata: { ...audioMetadata(media), errorDetails: undefined },
    }));
  } else if (file.type.startsWith('video/')) {
    const fitted = fitNodeSize(media.width || 1280, media.height || 720, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
    store.updateNode(nodeId, (node) => ({
      ...node,
      type: CanvasNodeType.Video,
      title: file.name,
      position: {
        x: node.position.x + node.width / 2 - fitted.width / 2,
        y: node.position.y + node.height / 2 - fitted.height / 2,
      },
      width: fitted.width,
      height: fitted.height,
      metadata: { ...videoMetadata(media), errorDetails: undefined },
    }));
  } else {
    const fitted = fitNodeSize(media.width || 640, media.height || 480);
    store.updateNode(nodeId, (node) => ({
      ...node,
      type: CanvasNodeType.Image,
      title: file.name,
      position: {
        x: node.position.x + node.width / 2 - fitted.width / 2,
        y: node.position.y + node.height / 2 - fitted.height / 2,
      },
      width: fitted.width,
      height: fitted.height,
      metadata: { ...imageMetadata(media), errorDetails: undefined },
    }));
  }
  store.setSelectedNodeIds(new Set([nodeId]));
  store.selectedConnectionId = null;
}

async function importFiles(files: File[], basePosition: Position) {
  const STAGGER = 40;
  uploading.value = true;
  uploadError.value = '';
  try {
    for (const [index, file] of files.entries()) {
      await createMediaNode(file, { x: basePosition.x + index * STAGGER, y: basePosition.y + index * STAGGER });
    }
  } catch (error) {
    console.error('[canvas] 上传失败', error);
    uploadError.value = '文件上传失败，请稍后重试';
  } finally {
    uploading.value = false;
  }
}

async function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/') || isAudioFile(f));
  input.value = '';
  if (!files.length) {
    uploadPositionRef.value = null;
    uploadTargetNodeId.value = null;
    return;
  }
  // 指定了目标节点：第一个文件替换该节点内容，其余在附近新建
  const targetNodeId = uploadTargetNodeId.value;
  uploadTargetNodeId.value = null;
  if (targetNodeId) {
    const [first, ...rest] = files;
    uploading.value = true;
    uploadError.value = '';
    try {
      await replaceNodeWithFile(targetNodeId, first);
      if (rest.length) {
        const target = nodes.value.find((n) => n.id === targetNodeId);
        const base = target ? { x: target.position.x + target.width + 40, y: target.position.y } : getCanvasCenter();
        await importFiles(rest, base);
      }
    } catch (error) {
      console.error('[canvas] 上传失败', error);
      uploadError.value = '文件上传失败，请稍后重试';
    } finally {
      uploading.value = false;
    }
    uploadPositionRef.value = null;
    return;
  }
  await importFiles(files, uploadPositionRef.value || getCanvasCenter());
  uploadPositionRef.value = null;
}

async function handleCanvasDrop(event: DragEvent) {
  event.preventDefault();
  const files = Array.from(event.dataTransfer?.files || []).filter(
    (f) => f.type.startsWith('image/') || f.type.startsWith('video/') || isAudioFile(f),
  );
  if (!files.length) return;
  await importFiles(files, screenToCanvas(event.clientX, event.clientY));
}

// ── 系统剪贴板粘贴（内部剪贴板为空时的回退） ───────────────────
async function pasteSystemClipboard() {
  if (!navigator.clipboard) return;
  try {
    const items = await navigator.clipboard.read();
    const imageItem = items.find((item) => item.types.some((type) => type.startsWith('image/')));
    if (imageItem) {
      const imageType = imageItem.types.find((type) => type.startsWith('image/'));
      if (!imageType) return;
      const blob = await imageItem.getType(imageType);
      await importFiles([new File([blob], '剪贴板图片.png', { type: imageType })], getCanvasCenter());
      return;
    }
  } catch {
    // 读取剪贴板被拒（权限）时回退纯文本
  }
  try {
    const text = (await navigator.clipboard.readText()).trim();
    if (!text) return;
    const node = store.addNode(CanvasNodeType.Text, getCanvasCenter(), { content: text, status: 'success' });
    store.updateNode(node.id, (n) => ({ ...n, title: text.slice(0, 32) || '剪贴板文本' }));
  } catch {
    // 无权限/无内容时静默
  }
}

// ── 右键菜单 ──────────────────────────────────────────────────
function handleNodeContextMenu(event: MouseEvent, nodeId: string) {
  event.preventDefault();
  if (!selectedNodeIds.value.has(nodeId)) {
    store.setSelectedNodeIds(new Set([nodeId]));
  }
  store.selectedConnectionId = null;
  store.contextMenu = { type: 'node', x: event.clientX, y: event.clientY, nodeId };
}

function handleConnectionContextMenu(event: MouseEvent, connectionId: string) {
  store.selectedConnectionId = connectionId;
  store.setSelectedNodeIds(new Set());
  store.contextMenu = { type: 'connection', x: event.clientX, y: event.clientY, connectionId };
}

function handleConnectionSelect(connectionId: string) {
  store.selectedConnectionId = connectionId;
  store.setSelectedNodeIds(new Set());
  store.contextMenu = null;
}

function handleContextMenuDelete() {
  const menu = contextMenu.value;
  if (!menu) return;
  if (menu.type === 'node') store.deleteNodes(new Set([menu.nodeId]));
  else store.deleteConnection(menu.connectionId);
  store.contextMenu = null;
}

function handleContextMenuDuplicate() {
  const menu = contextMenu.value;
  if (menu?.type !== 'node') return;
  store.duplicateNode(menu.nodeId);
  store.contextMenu = null;
}

// ── 图片预览 ──────────────────────────────────────────────────
const previewNode = ref<CanvasNodeData | null>(null);

// ── 清空画布 ──────────────────────────────────────────────────
const clearConfirmOpen = ref(false);

function clearCanvas() {
  store.clearCanvas();
  clearConfirmOpen.value = false;
}

// ── 渲染数据：视口剔除 + 关联高亮 + 分组计数 ───────────────────
const visibleNodes = computed(() => {
  const rect = containerEl.value?.getBoundingClientRect();
  const width = rect?.width || size.value.width;
  const height = rect?.height || size.value.height;
  const v = viewport.value;
  const viewLeft = -v.x / v.k - CULL_PADDING;
  const viewTop = -v.y / v.k - CULL_PADDING;
  const viewRight = viewLeft + width / v.k + CULL_PADDING * 2;
  const viewBottom = viewTop + height / v.k + CULL_PADDING * 2;

  return nodes.value.filter(
    (node) =>
      !isHiddenBatchChild(node, nodes.value) &&
      node.position.x + node.width > viewLeft &&
      node.position.x < viewRight &&
      node.position.y + node.height > viewTop &&
      node.position.y < viewBottom,
  );
});

const activeNodeId = computed(() => {
  if (selectedNodeIds.value.size > 1) return null;
  return hoveredNodeId.value || (selectedNodeIds.value.size === 1 ? Array.from(selectedNodeIds.value)[0] : null);
});

const relatedHighlight = computed(() => {
  const nodeIds = new Set<string>();
  const connectionIds = new Set<string>();
  const activeId = activeNodeId.value;
  if (!activeId) return { nodeIds, connectionIds };
  nodeIds.add(activeId);
  store.connections.forEach((connection) => {
    if (connection.fromNodeId !== activeId && connection.toNodeId !== activeId) return;
    connectionIds.add(connection.id);
    nodeIds.add(connection.fromNodeId);
    nodeIds.add(connection.toNodeId);
  });
  return { nodeIds, connectionIds };
});

const groupChildCountById = computed(() => {
  const map = new Map<string, number>();
  nodes.value.forEach((node) => {
    const groupId = node.metadata?.groupId;
    if (groupId) map.set(groupId, (map.get(groupId) || 0) + 1);
  });
  return map;
});

// ── 顶栏：重命名 + 保存状态 ────────────────────────────────────
const titleEditing = ref(false);
const titleDraft = ref('');

function startTitleEditing() {
  titleDraft.value = store.name;
  titleEditing.value = true;
}

async function finishTitleEditing() {
  const next = titleDraft.value.trim();
  titleEditing.value = false;
  if (next && next !== store.name) {
    try {
      await store.renameProject(next);
    } catch {
      // 重命名失败：保持原名称（titleEditing 已关闭，输入丢弃）
    }
  }
}

const saveStatusText = computed(() => {
  if (saving.value) return '保存中…';
  if (dirty.value) return '未保存';
  return '已保存';
});

// ── 导出（zip：project.json + 媒体文件） ───────────────────────
const exporting = ref(false);

async function handleExportProject() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    await store.saveNow();
    await exportCanvasProject(store.name || '未命名画布', {
      nodes: nodes.value,
      connections: store.connections,
      viewport: viewport.value,
    });
  } finally {
    exporting.value = false;
  }
}

async function handleExportSelected() {
  if (exporting.value || !selectedNodeIds.value.size) return;
  exporting.value = true;
  try {
    const selected = nodes.value.filter((node) => selectedNodeIds.value.has(node.id));
    await exportCanvasNodes(selected);
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <main class="flex h-screen flex-col overflow-hidden bg-bg text-fg">
    <!-- 顶栏 -->
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-xl">
      <router-link
        to="/canvas"
        class="od-icon-btn"
        title="返回画布列表"
        aria-label="返回画布列表"
      >
        <AppIcon
          name="arrow-left"
          :size="18"
        />
      </router-link>
      <input
        v-if="titleEditing"
        v-model="titleDraft"
        maxlength="200"
        class="od-input h-8 w-56 text-sm"
        @blur="finishTitleEditing"
        @keydown.enter="finishTitleEditing"
        @keydown.esc="titleEditing = false"
      >
      <button
        v-else
        type="button"
        class="max-w-72 truncate rounded-md px-2 py-1 text-sm font-semibold text-fg transition hover:bg-accent-soft"
        title="双击重命名"
        @dblclick="startTitleEditing"
      >
        {{ store.name || '未命名画布' }}
      </button>
      <span class="text-xs text-muted">{{ saveStatusText }}</span>
      <span
        v-if="uploading"
        class="text-xs text-muted"
      >上传中…</span>
      <span
        v-if="uploadError"
        class="text-xs text-danger"
      >{{ uploadError }}</span>
      <div class="ml-auto flex items-center gap-1">
        <button
          v-if="selectedNodeIds.size"
          type="button"
          class="od-icon-btn"
          :class="{ 'opacity-35 pointer-events-none': exporting }"
          :title="`导出选中的 ${selectedNodeIds.size} 个节点`"
          aria-label="导出选中节点"
          @click="handleExportSelected"
        >
          <AppIcon
            name="download"
            :size="18"
          />
        </button>
        <button
          type="button"
          class="od-icon-btn"
          :class="{ 'opacity-35 pointer-events-none': exporting }"
          title="导出画布（zip）"
          aria-label="导出画布"
          @click="handleExportProject"
        >
          <AppIcon
            name="download"
            :size="18"
          />
        </button>
        <button
          type="button"
          class="od-icon-btn"
          :class="{ 'opacity-35 pointer-events-none': !store.canUndo }"
          title="撤销"
          aria-label="撤销"
          @click="store.undo()"
        >
          <AppIcon
            name="undo"
            :size="18"
          />
        </button>
        <button
          type="button"
          class="od-icon-btn"
          :class="{ 'opacity-35 pointer-events-none': !store.canRedo }"
          title="重做"
          aria-label="重做"
          @click="store.redo()"
        >
          <AppIcon
            name="redo"
            :size="18"
          />
        </button>
      </div>
    </header>

    <!-- 画布区 -->
    <section class="relative min-h-0 flex-1 overflow-hidden">
      <div
        v-if="loadError"
        class="grid h-full place-items-center"
      >
        <div class="text-center">
          <p class="mb-4 text-muted">
            {{ loadError }}
          </p>
          <router-link
            to="/canvas"
            class="od-btn od-btn-primary"
          >
            返回画布列表
          </router-link>
        </div>
      </div>

      <InfiniteCanvas
        v-else-if="loaded"
        ref="infiniteCanvasRef"
        @canvas-mouse-down="handleCanvasMouseDown"
        @canvas-deselect="handleCanvasDeselect"
        @canvas-double-click="handleCanvasDoubleClick"
        @canvas-context-menu="preventCanvasContextMenu"
        @canvas-drop="handleCanvasDrop"
      >
        <CanvasConnections
          :related-connection-ids="relatedHighlight.connectionIds"
          @select="handleConnectionSelect"
          @context-menu="handleConnectionContextMenu"
        />

        <CanvasNode
          v-for="node in visibleNodes"
          :key="node.id"
          :node="node"
          :is-selected="selectedNodeIds.has(node.id)"
          :is-related="relatedHighlight.nodeIds.has(node.id)"
          :is-focus-related="activeNodeId === node.id"
          :is-connection-target="store.connectionTargetNodeId === node.id"
          :is-connecting="Boolean(store.connecting)"
          :show-image-info="store.showImageInfo"
          :group-child-count="groupChildCountById.get(node.id) || 0"
          :is-group-drop-target="dropTargetGroupId === node.id"
          @mouse-down="handleNodeMouseDown"
          @select-capture="handleNodeSelectCapture"
          @hover-start="(id) => (store.hoveredNodeId = id)"
          @hover-end="handleNodeHoverEnd"
          @connect-start="handleConnectStart"
          @context-menu="handleNodeContextMenu"
          @view-image="(n) => (previewNode = n)"
          @upload-into="(id) => handleUploadRequest(undefined, id)"
        />

        <!-- 框选矩形 -->
        <div
          v-if="selectionBox"
          class="pointer-events-none absolute z-[100] border"
          :style="{
            left: `${Math.min(selectionBox.startWorldX, selectionBox.currentWorldX)}px`,
            top: `${Math.min(selectionBox.startWorldY, selectionBox.currentWorldY)}px`,
            width: `${Math.abs(selectionBox.currentWorldX - selectionBox.startWorldX)}px`,
            height: `${Math.abs(selectionBox.currentWorldY - selectionBox.startWorldY)}px`,
            borderColor: '#2f80ff',
            background: '#2f80ff14',
          }"
        />

        <!-- 连线落空白：创建并连接 -->
        <CanvasCreateMenu
          v-if="pendingConnectionCreate"
          connection-mode
          :position="pendingConnectionCreate.position"
          @select="createConnectedNode"
          @close="cancelPendingConnectionCreate"
        />
        <!-- 双击空白：创建节点 -->
        <CanvasCreateMenu
          v-if="nodeCreatePosition"
          :position="nodeCreatePosition"
          @select="handleNodeCreateMenuSelect"
          @close="nodeCreatePosition = null"
        />
      </InfiniteCanvas>

      <div
        v-else
        class="grid h-full place-items-center text-sm text-muted"
      >
        画布加载中…
      </div>

      <!-- 悬浮控件（拖拽/缩放时仍可用） -->
      <CanvasToolbar
        v-if="loaded"
        :selected-count="selectedNodeIds.size"
        :can-undo="store.canUndo"
        :can-redo="store.canRedo"
        :background-mode="store.backgroundMode"
        :show-image-info="store.showImageInfo"
        @add-node="(type) => createNode(type)"
        @upload="handleUploadRequest()"
        @undo="store.undo()"
        @redo="store.redo()"
        @delete-selected="store.deleteNodes(new Set(selectedNodeIds))"
        @clear="clearConfirmOpen = true"
        @deselect="handleCanvasDeselect"
        @background-mode-change="(mode) => (store.backgroundMode = mode)"
        @show-image-info-change="(show) => (store.showImageInfo = show)"
      />

      <CanvasZoomControls
        v-if="loaded"
        :scale="viewport.k"
        @scale-change="setZoomScale"
        @reset="resetViewport"
      />

      <CanvasMiniMap
        v-if="loaded"
        :nodes="nodes"
        :viewport="viewport"
        :viewport-size="size"
        @viewport-change="(next) => store.setViewport(next)"
      />

      <CanvasContextMenu
        v-if="contextMenu"
        :menu="contextMenu"
        @close="store.contextMenu = null"
        @duplicate="handleContextMenuDuplicate"
        @delete="handleContextMenuDelete"
      />

      <!-- 隐藏的文件输入 -->
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="image/*,video/*,audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
        class="hidden"
        @change="handleFileInputChange"
      >

      <!-- 图片预览 -->
      <div
        v-if="previewNode?.metadata?.content"
        class="od-modal-overlay"
        @click.self="previewNode = null"
      >
        <div class="flex max-h-[85vh] max-w-[90vw] flex-col items-center gap-3">
          <img
            :src="mediaUrl(previewNode.metadata.content)"
            :alt="previewNode.title"
            class="max-h-[80vh] max-w-full rounded-2xl object-contain"
          >
          <button
            class="od-btn od-btn-ghost"
            @click="previewNode = null"
          >
            关闭
          </button>
        </div>
      </div>

      <!-- 清空确认 -->
      <ConfirmDeleteModal
        v-if="clearConfirmOpen"
        title="清空画布"
        message="确定清空整个画布吗？所有节点和连线都会被删除，可通过撤销恢复。"
        @cancel="clearConfirmOpen = false"
        @confirm="clearCanvas"
      />

      <!-- 409 冲突提示 -->
      <div
        v-if="conflict"
        class="od-modal-overlay"
      >
        <div class="od-card w-full max-w-sm p-6">
          <h2 class="font-display text-lg font-bold text-fg mb-2">
            画布已被其他操作修改
          </h2>
          <p class="text-muted text-sm mb-6">
            画布在其他标签页或被 AI 助手修改过。为避免覆盖，请刷新画布以后端内容为准（未保存的本地修改将丢失）。
          </p>
          <button
            class="od-btn od-btn-primary w-full"
            @click="store.reloadAfterConflict()"
          >
            刷新画布
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
