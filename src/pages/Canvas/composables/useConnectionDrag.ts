// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/pages/canvas/project.tsx 的连线段（handleConnectStart、getConnectionDropTarget、
// handleGlobalMouseMove/MouseUp 的连线分支）
// 从连接点拖出临时贝塞尔，落点优先级：节点内部 > 连接点半径 > 节点附近；
// 落在空白 → 挂起 pendingConnectionCreate，由页面弹「创建并连接」菜单。
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { getConnectionTargetAnchor, isHiddenBatchChild, normalizeConnection } from '../../../lib/canvas/canvas-node-geometry';
import { useCanvasStore } from '../../../stores/canvas';
import type { ConnectionHandle, Position } from '../../../types/canvas';
import type { ScreenToCanvas } from './types';

const CONNECTION_HANDLE_HIT_RADIUS = 40;
const CONNECTION_NODE_HIT_PADDING = 32;

export type PendingConnectionCreate = {
  connection: ConnectionHandle;
  position: Position;
};

type ConnectionDropTarget = {
  nodeId: string | null;
  isNearNode: boolean;
};

export function useConnectionDrag(options: { screenToCanvas: ScreenToCanvas }) {
  const store = useCanvasStore();
  const pendingConnectionCreate = ref<PendingConnectionCreate | null>(null);

  function setConnecting(next: ConnectionHandle | null) {
    store.connecting = next;
    if (!next) store.connectionTargetNodeId = null;
  }

  function handleConnectStart(event: MouseEvent, nodeId: string, handleType: 'source' | 'target') {
    event.stopPropagation();
    store.mouseWorld = options.screenToCanvas(event.clientX, event.clientY);
    setConnecting({ nodeId, handleType });
    store.selectedConnectionId = null;
  }

  function cancelPendingConnectionCreate() {
    pendingConnectionCreate.value = null;
    setConnecting(null);
  }

  function getConnectionDropTarget(clientX: number, clientY: number, current: ConnectionHandle): ConnectionDropTarget {
    const world = options.screenToCanvas(clientX, clientY);
    const scale = Math.max(store.viewport.k, 0.05);
    const padding = CONNECTION_NODE_HIT_PADDING / scale;
    const handleRadius = CONNECTION_HANDLE_HIT_RADIUS / scale;
    let isNearNode = false;
    let bestNodeId: string | null = null;
    let bestPriority = Number.POSITIVE_INFINITY;

    [...store.nodes]
      .filter((node) => !isHiddenBatchChild(node, store.nodes))
      .reverse()
      .forEach((node) => {
        const anchor = getConnectionTargetAnchor(node, current);
        const dx = world.x - anchor.x;
        const dy = world.y - anchor.y;
        const hitsHandle = dx * dx + dy * dy <= handleRadius * handleRadius;
        const hitsInside =
          world.x >= node.position.x && world.x <= node.position.x + node.width && world.y >= node.position.y && world.y <= node.position.y + node.height;
        const hitsExpanded =
          world.x >= node.position.x - padding &&
          world.x <= node.position.x + node.width + padding &&
          world.y >= node.position.y - padding &&
          world.y <= node.position.y + node.height + padding;

        if (!hitsHandle && !hitsInside && !hitsExpanded) return;
        isNearNode = true;
        if (node.id === current.nodeId || !normalizeConnection(current.nodeId, node.id, store.nodes, current.handleType)) return;

        const priority = hitsInside ? 0 : hitsHandle ? 1 : 2;
        if (priority < bestPriority) {
          bestNodeId = node.id;
          bestPriority = priority;
        }
      });

    return { nodeId: bestNodeId, isNearNode };
  }

  function handleGlobalMouseMove(event: MouseEvent) {
    if (!store.connecting || pendingConnectionCreate.value) return;
    const dropTarget = getConnectionDropTarget(event.clientX, event.clientY, store.connecting);
    store.connectionTargetNodeId = dropTarget.nodeId;
    store.mouseWorld = options.screenToCanvas(event.clientX, event.clientY);
  }

  function handleGlobalMouseUp(event: MouseEvent) {
    if (pendingConnectionCreate.value) return;
    const currentConnection = store.connecting;
    if (!currentConnection) return;

    const dropTarget = getConnectionDropTarget(event.clientX, event.clientY, currentConnection);
    if (dropTarget.nodeId) {
      store.connectNodes(currentConnection, dropTarget.nodeId);
      setConnecting(null);
    } else if (dropTarget.isNearNode) {
      setConnecting(null);
    } else {
      const world = options.screenToCanvas(event.clientX, event.clientY);
      store.mouseWorld = world;
      pendingConnectionCreate.value = { connection: currentConnection, position: world };
    }
  }

  onMounted(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  });

  return { pendingConnectionCreate, handleConnectStart, setConnecting, cancelPendingConnectionCreate };
}
