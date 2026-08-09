// 画布编辑器文档态 store（画布唯一权威数据源）
// 设计来源：infinite-canvas web/src/pages/canvas/project.tsx 的状态机（AGPL-3.0，See NOTICE），
// 按本项目后端持久化方案重构：
// - nodes/connections 整文档 debounced PUT /canvas-projects/:id（baseVersion 乐观锁）
// - 历史 = {nodes, connections} 全量快照（不可变更新，快照即旧数组引用，零拷贝）
// - 180ms 防抖提交历史、500ms 防抖保存、拖拽经 pauseHistory/resumeHistory 合并为单步
// - focus / 30s 轮询比对 version：远端变了且本地干净 → 静默重拉；本地脏 → 冲突提示
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { canvasApi } from '../lib/canvas-api';
import { createCanvasNode } from '../lib/canvas/canvas-node-factory';
import { findContainingGroupId, findGroupDropTarget, normalizeConnection, snapNodesIntoGroup } from '../lib/canvas/canvas-node-geometry';
import {
  CanvasNodeType,
  type CanvasBackgroundMode,
  type CanvasConnection,
  type CanvasNodeData,
  type CanvasNodeMetadata,
  type CanvasNodeTypeId,
  type ConnectionHandle,
  type ContextMenuState,
  type Position,
  type SelectionBox,
  type ViewportTransform,
} from '../types/canvas';

type CanvasSnapshot = { nodes: CanvasNodeData[]; connections: CanvasConnection[] };
type CanvasClipboard = { nodes: CanvasNodeData[]; connections: CanvasConnection[] };

const HISTORY_LIMIT = 50;
const HISTORY_COMMIT_DEBOUNCE = 180;
const SAVE_DEBOUNCE = 500;
const VERSION_POLL_INTERVAL = 30_000;

// 非响应式内部态：历史栈/定时器/剪贴板（不进 ref，避免深度代理快照）
const historyPast: CanvasSnapshot[] = [];
let historyFuture: CanvasSnapshot[] = [];
let lastSnapshot: CanvasSnapshot | null = null;
let historyCommitTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let versionPollTimer: ReturnType<typeof setInterval> | null = null;
let applyingHistory = false;
let historyPaused = false;
let clipboard: CanvasClipboard | null = null;

export const useCanvasStore = defineStore('canvas', () => {
  // ── 服务端同步态 ──────────────────────────────────────────────
  const projectId = ref<string | null>(null);
  const name = ref('');
  const version = ref(0);
  const loaded = ref(false);
  const loading = ref(false);
  const loadError = ref('');
  const dirty = ref(false);
  const saving = ref(false);
  /** 409 冲突或远端版本超前且本地有未保存修改：提示用户刷新以后端为准 */
  const conflict = ref(false);

  // ── 文档态 ──────────────────────────────────────────────────
  const nodes = ref<CanvasNodeData[]>([]);
  const connections = ref<CanvasConnection[]>([]);
  const viewport = ref<ViewportTransform>({ x: 0, y: 0, k: 1 });

  // ── 选区与瞬态交互态 ────────────────────────────────────────
  const selectedNodeIds = ref<Set<string>>(new Set());
  const selectedConnectionId = ref<string | null>(null);
  const hoveredNodeId = ref<string | null>(null);
  const connecting = ref<ConnectionHandle | null>(null);
  const connectionTargetNodeId = ref<string | null>(null);
  const mouseWorld = ref<Position>({ x: 0, y: 0 });
  const selectionBox = ref<SelectionBox | null>(null);
  const contextMenu = ref<ContextMenuState | null>(null);
  const backgroundMode = ref<CanvasBackgroundMode>('lines');
  const showImageInfo = ref(false);
  const dropTargetGroupId = ref<string | null>(null);
  const isNodeDragging = ref(false);
  const isNodeResizing = ref(false);

  // ── 历史可用性（镜像非响应式栈长度） ─────────────────────────
  const canUndo = ref(false);
  const canRedo = ref(false);

  const nodeById = computed(() => new Map(nodes.value.map((node) => [node.id, node])));
  const hasSelection = computed(() => selectedNodeIds.value.size > 0);

  // ── 内部：快照与历史 ────────────────────────────────────────
  const snapshot = (): CanvasSnapshot => ({ nodes: nodes.value, connections: connections.value });

  function syncHistoryFlags() {
    canUndo.value = historyPast.length > 0;
    canRedo.value = historyFuture.length > 0;
  }

  function clearHistoryCommitTimer() {
    if (historyCommitTimer) {
      clearTimeout(historyCommitTimer);
      historyCommitTimer = null;
    }
  }

  function scheduleHistoryCommit() {
    clearHistoryCommitTimer();
    historyCommitTimer = setTimeout(() => {
      historyCommitTimer = null;
      if (!lastSnapshot) return;
      historyPast.push(lastSnapshot);
      if (historyPast.length > HISTORY_LIMIT) historyPast.shift();
      historyFuture = [];
      lastSnapshot = snapshot();
      syncHistoryFlags();
    }, HISTORY_COMMIT_DEBOUNCE);
  }

  // ── 内部：保存 ──────────────────────────────────────────────
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void saveNow();
    }, SAVE_DEBOUNCE);
  }

  /** 立即保存整文档（卸载/冲突重拉前调用）。409 → 置冲突态，不覆盖远端。 */
  async function saveNow() {
    if (!projectId.value || !loaded.value || !dirty.value || saving.value) return;
    saving.value = true;
    try {
      const saved = await canvasApi.updateDocument(
        projectId.value,
        { nodes: nodes.value, connections: connections.value, viewport: viewport.value },
        version.value,
      );
      version.value = saved.version;
      dirty.value = false;
    } catch (error: unknown) {
      if (isConflictError(error)) {
        conflict.value = true;
      } else {
        console.error('[canvas] 保存失败', error);
      }
      // 保存失败保持 dirty，下一轮 scheduleSave 或下次操作会重试
    } finally {
      saving.value = false;
    }
  }

  // ── 加载 / 卸载 ─────────────────────────────────────────────
  /** 加载项目；返回是否从文档恢复了视口（否则编辑器页负责居中） */
  async function load(id: string): Promise<{ restoredViewport: boolean }> {
    loading.value = true;
    loadError.value = '';
    conflict.value = false;
    try {
      const project = await canvasApi.getById(id);
      projectId.value = project.id;
      name.value = project.name;
      version.value = project.version;
      nodes.value = project.document.nodes || [];
      connections.value = project.document.connections || [];
      const restoredViewport = Boolean(project.document.viewport);
      if (project.document.viewport) viewport.value = project.document.viewport;
      // 历史与瞬态全部重置
      historyPast.length = 0;
      historyFuture = [];
      clearHistoryCommitTimer();
      lastSnapshot = snapshot();
      applyingHistory = false;
      historyPaused = false;
      dirty.value = false;
      clearInteraction();
      loaded.value = true;
      return { restoredViewport };
    } catch (error) {
      console.error('[canvas] 加载失败', error);
      loadError.value = '画布加载失败或不存在';
      loaded.value = false;
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function unload() {
    stopVersionPolling();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    clearHistoryCommitTimer();
    projectId.value = null;
    name.value = '';
    version.value = 0;
    loaded.value = false;
    dirty.value = false;
    conflict.value = false;
    nodes.value = [];
    connections.value = [];
    viewport.value = { x: 0, y: 0, k: 1 };
    historyPast.length = 0;
    historyFuture = [];
    lastSnapshot = null;
    applyingHistory = false;
    historyPaused = false;
    syncHistoryFlags();
    clearInteraction();
  }

  function clearInteraction() {
    selectedNodeIds.value = new Set();
    selectedConnectionId.value = null;
    hoveredNodeId.value = null;
    connecting.value = null;
    connectionTargetNodeId.value = null;
    selectionBox.value = null;
    contextMenu.value = null;
    dropTargetGroupId.value = null;
    isNodeDragging.value = false;
    isNodeResizing.value = false;
  }

  // ── 文档变更唯一入口 ────────────────────────────────────────
  /**
   * 不可变更新文档：传入新数组（未变的字段省略）。
   * 引用相等 → 跳过；拖拽中（pauseHistory）只改状态不提交历史。
   */
  function applyLocal(next: { nodes?: CanvasNodeData[]; connections?: CanvasConnection[] }) {
    const nextNodes = next.nodes ?? nodes.value;
    const nextConnections = next.connections ?? connections.value;
    if (nextNodes === nodes.value && nextConnections === connections.value) return;
    nodes.value = nextNodes;
    connections.value = nextConnections;
    dirty.value = true;
    if (!applyingHistory && !historyPaused) scheduleHistoryCommit();
    scheduleSave();
  }

  function pauseHistory() {
    clearHistoryCommitTimer();
    historyPaused = true;
  }

  /** 手势结束：把暂停期间的连续变更合并为一步历史 */
  function resumeHistory() {
    historyPaused = false;
    scheduleHistoryCommit();
  }

  // ── 撤销 / 重做 ─────────────────────────────────────────────
  function applySnapshot(entry: CanvasSnapshot) {
    clearHistoryCommitTimer();
    applyingHistory = true;
    nodes.value = entry.nodes;
    connections.value = entry.connections;
    dirty.value = true;
    selectedNodeIds.value = new Set();
    selectedConnectionId.value = null;
    contextMenu.value = null;
    // 与源实现一致：下一拍再落 lastSnapshot，避免 undo 本身触发一次历史提交
    setTimeout(() => {
      lastSnapshot = entry;
      applyingHistory = false;
      syncHistoryFlags();
    });
    scheduleSave();
  }

  function undo() {
    const previous = historyPast.pop();
    if (!previous || !lastSnapshot) return;
    historyFuture.push(snapshot());
    applySnapshot(previous);
  }

  function redo() {
    const next = historyFuture.pop();
    if (!next || !lastSnapshot) return;
    historyPast.push(snapshot());
    applySnapshot(next);
  }

  // ── 视口 ────────────────────────────────────────────────────
  function setViewport(next: ViewportTransform) {
    viewport.value = next;
    dirty.value = true;
    scheduleSave();
  }

  // ── 选区 ────────────────────────────────────────────────────
  function setSelectedNodeIds(ids: Set<string>) {
    selectedNodeIds.value = ids;
  }

  function deselectAll() {
    selectedNodeIds.value = new Set();
    selectedConnectionId.value = null;
    contextMenu.value = null;
    selectionBox.value = null;
    hoveredNodeId.value = null;
  }

  // ── 节点操作 ────────────────────────────────────────────────
  function addNode(type: CanvasNodeTypeId, position: Position, metadata?: CanvasNodeMetadata) {
    const node = createCanvasNode(type, position, metadata);
    applyLocal({ nodes: [...nodes.value, node] });
    selectedNodeIds.value = new Set([node.id]);
    selectedConnectionId.value = null;
    return node;
  }

  function updateNode(id: string, updater: (node: CanvasNodeData) => CanvasNodeData) {
    applyLocal({ nodes: nodes.value.map((node) => (node.id === id ? updater(node) : node)) });
  }

  function updateNodeMetadata(id: string, patch: Partial<CanvasNodeMetadata>) {
    updateNode(id, (node) => ({ ...node, metadata: { ...node.metadata, ...patch } }));
  }

  function deleteNodes(ids: Set<string>) {
    if (!ids.size) return;
    // 批次根删除时级联其所有子图
    const allIds = new Set(ids);
    nodes.value.forEach((node) => {
      if (ids.has(node.id)) node.metadata?.batchChildIds?.forEach((childId) => allIds.add(childId));
    });
    const nextNodes = nodes.value
      .filter((node) => !allIds.has(node.id))
      .map((node) => {
        // 脱离已删除的分组 / 批次根的引用清理
        const groupId = node.metadata?.groupId;
        if (groupId && allIds.has(groupId)) return { ...node, metadata: { ...node.metadata, groupId: undefined } };
        if (!node.metadata?.isBatchRoot) return node;
        const childIds = node.metadata.batchChildIds?.filter((childId) => !allIds.has(childId));
        if (childIds?.length === node.metadata.batchChildIds?.length) return node;
        return { ...node, metadata: { ...node.metadata, batchChildIds: childIds } };
      });
    applyLocal({
      nodes: nextNodes,
      connections: connections.value.filter((conn) => !allIds.has(conn.fromNodeId) && !allIds.has(conn.toNodeId)),
    });
    selectedNodeIds.value = new Set();
    selectedConnectionId.value = null;
    contextMenu.value = null;
    if (hoveredNodeId.value && allIds.has(hoveredNodeId.value)) hoveredNodeId.value = null;
  }

  function deleteConnection(connectionId: string) {
    applyLocal({ connections: connections.value.filter((conn) => conn.id !== connectionId) });
    if (selectedConnectionId.value === connectionId) selectedConnectionId.value = null;
    if (contextMenu.value?.type === 'connection' && contextMenu.value.connectionId === connectionId) contextMenu.value = null;
  }

  /** 连线落点确认：规范化方向（config 只能作目标）后去重添加 */
  function connectNodes(current: ConnectionHandle, targetNodeId: string): boolean {
    if (current.nodeId === targetNodeId) return false;
    const connection = normalizeConnection(current.nodeId, targetNodeId, nodes.value, current.handleType);
    if (!connection) return false;
    const exists = connections.value.some((conn) => conn.fromNodeId === connection.fromNodeId && conn.toNodeId === connection.toNodeId);
    if (!exists) {
      applyLocal({
        connections: [...connections.value, { id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...connection }],
      });
    }
    contextMenu.value = null;
    return true;
  }

  // ── 拖拽结束：分组吸附（由 useNodeDrag 调用） ────────────────
  function finishNodeMove(movedIds: Set<string>, movedNodes: CanvasNodeData[]) {
    const targetGroup = findGroupDropTarget(movedIds, movedNodes);
    if (targetGroup) {
      applyLocal({ nodes: snapNodesIntoGroup(movedIds, movedNodes, targetGroup) });
      return;
    }
    applyLocal({
      nodes: movedNodes.map((node) => {
        if (!movedIds.has(node.id) || node.type === CanvasNodeType.Group) return node;
        const groupId = findContainingGroupId(node, movedNodes);
        if (node.metadata?.groupId === groupId) return node;
        return { ...node, metadata: { ...node.metadata, groupId } };
      }),
    });
  }

  // ── 复制 / 粘贴 / 副本 ──────────────────────────────────────
  function copySelectedNodes() {
    const ids = selectedNodeIds.value;
    if (!ids.size) return;
    const copiedNodes = nodes.value
      .filter((node) => ids.has(node.id))
      .map((node) => ({ ...node, position: { ...node.position }, metadata: node.metadata ? { ...node.metadata } : undefined }));
    if (!copiedNodes.length) return;
    clipboard = {
      nodes: copiedNodes,
      connections: connections.value
        .filter((conn) => ids.has(conn.fromNodeId) && ids.has(conn.toNodeId))
        .map((conn) => ({ ...conn })),
    };
  }

  /** 粘贴到指定世界坐标中心；无剪贴板返回 false（调用方可回退系统剪贴板） */
  function pasteCopiedNodes(center: Position): boolean {
    if (!clipboard?.nodes.length) return false;
    const bounds = clipboard.nodes.reduce(
      (acc, node) => ({
        left: Math.min(acc.left, node.position.x),
        top: Math.min(acc.top, node.position.y),
        right: Math.max(acc.right, node.position.x + node.width),
        bottom: Math.max(acc.bottom, node.position.y + node.height),
      }),
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
    );
    const dx = center.x - (bounds.left + bounds.right) / 2;
    const dy = center.y - (bounds.top + bounds.bottom) / 2;
    const idMap = new Map<string, string>();
    const pastedNodes = clipboard.nodes.map((node, index) => {
      const id = `${node.type}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
      idMap.set(node.id, id);
      return {
        ...node,
        id,
        title: node.title.endsWith(' 副本') ? node.title : `${node.title} 副本`,
        position: { x: node.position.x + dx, y: node.position.y + dy },
        metadata: node.metadata ? { ...node.metadata } : undefined,
      };
    });
    // groupId 需二次映射（组节点可能排在子节点之后，第一遍 idMap 尚不完整）
    const finalNodes = pastedNodes.map((node) => {
      const groupId = node.metadata?.groupId;
      if (!groupId) return node;
      return { ...node, metadata: { ...node.metadata, groupId: idMap.get(groupId) } };
    });
    const pastedConnections = clipboard.connections.flatMap((conn, index) => {
      const fromNodeId = idMap.get(conn.fromNodeId);
      const toNodeId = idMap.get(conn.toNodeId);
      if (!fromNodeId || !toNodeId) return [];
      return [{ ...conn, id: `conn-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`, fromNodeId, toNodeId }];
    });
    applyLocal({ nodes: [...nodes.value, ...finalNodes], connections: [...connections.value, ...pastedConnections] });
    selectedNodeIds.value = new Set(finalNodes.map((node) => node.id));
    selectedConnectionId.value = null;
    contextMenu.value = null;
    return true;
  }

  function duplicateNode(nodeId: string) {
    const source = nodes.value.find((node) => node.id === nodeId);
    if (!source) return;
    const id = `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    applyLocal({
      nodes: [
        ...nodes.value,
        { ...source, id, title: `${source.title} 副本`, position: { x: source.position.x + 36, y: source.position.y + 36 } },
      ],
    });
    selectedNodeIds.value = new Set([id]);
    selectedConnectionId.value = null;
  }

  function clearCanvas() {
    applyLocal({ nodes: [], connections: [] });
    deselectAll();
  }

  // ── 批次（组图）展开/主图 ────────────────────────────────────
  function toggleBatchExpanded(nodeId: string) {
    updateNode(nodeId, (node) => ({ ...node, metadata: { ...node.metadata, imageBatchExpanded: !node.metadata?.imageBatchExpanded } }));
  }

  function setBatchPrimary(child: CanvasNodeData) {
    const rootId = child.metadata?.batchRootId;
    if (!rootId || !child.metadata?.content) return;
    updateNode(rootId, (node) => ({
      ...node,
      width: child.width,
      height: child.height,
      metadata: {
        ...node.metadata,
        content: child.metadata?.content,
        primaryImageId: child.id,
        naturalWidth: child.metadata?.naturalWidth,
        naturalHeight: child.metadata?.naturalHeight,
        freeResize: child.metadata?.freeResize,
      },
    }));
  }

  // ── 重命名 ──────────────────────────────────────────────────
  async function renameProject(nextName: string) {
    if (!projectId.value) return;
    const saved = await canvasApi.rename(projectId.value, nextName);
    name.value = saved.name;
  }

  // ── 版本同步（focus / 30s 轮询） ─────────────────────────────
  /** 返回 true 表示发生了静默重拉 */
  async function syncVersion(): Promise<boolean> {
    if (!projectId.value || !loaded.value) return false;
    try {
      const { version: remoteVersion } = await canvasApi.getVersion(projectId.value);
      if (remoteVersion === version.value) return false;
      if (dirty.value) {
        // 本地有未保存修改：不擅自覆盖，交给冲突提示
        conflict.value = true;
        return false;
      }
      const id = projectId.value;
      await load(id);
      return true;
    } catch {
      return false; // 静默轮询失败不打扰用户
    }
  }

  function startVersionPolling() {
    stopVersionPolling();
    const onFocus = () => void syncVersion();
    window.addEventListener('focus', onFocus);
    versionPollTimer = setInterval(() => void syncVersion(), VERSION_POLL_INTERVAL);
    // 卸载时移除监听（stopVersionPolling 内联不了监听器引用，挂到 store 外）
    focusListener = onFocus;
  }

  function stopVersionPolling() {
    if (versionPollTimer) {
      clearInterval(versionPollTimer);
      versionPollTimer = null;
    }
    if (focusListener) {
      window.removeEventListener('focus', focusListener);
      focusListener = null;
    }
  }

  /** 冲突确认：丢弃本地未保存修改，以后端为准重拉 */
  async function reloadAfterConflict() {
    if (!projectId.value) return;
    conflict.value = false;
    await load(projectId.value);
  }

  return {
    // 状态
    projectId,
    name,
    version,
    loaded,
    loading,
    loadError,
    dirty,
    saving,
    conflict,
    nodes,
    connections,
    viewport,
    selectedNodeIds,
    selectedConnectionId,
    hoveredNodeId,
    connecting,
    connectionTargetNodeId,
    mouseWorld,
    selectionBox,
    contextMenu,
    backgroundMode,
    showImageInfo,
    dropTargetGroupId,
    isNodeDragging,
    isNodeResizing,
    canUndo,
    canRedo,
    nodeById,
    hasSelection,
    // 动作
    load,
    unload,
    applyLocal,
    pauseHistory,
    resumeHistory,
    undo,
    redo,
    saveNow,
    setViewport,
    setSelectedNodeIds,
    deselectAll,
    addNode,
    updateNode,
    updateNodeMetadata,
    deleteNodes,
    deleteConnection,
    connectNodes,
    finishNodeMove,
    copySelectedNodes,
    pasteCopiedNodes,
    duplicateNode,
    clearCanvas,
    toggleBatchExpanded,
    setBatchPrimary,
    renameProject,
    syncVersion,
    startVersionPolling,
    stopVersionPolling,
    reloadAfterConflict,
  };
});

let focusListener: (() => void) | null = null;

function isConflictError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 409
  );
}
