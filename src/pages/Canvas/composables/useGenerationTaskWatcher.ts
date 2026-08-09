// 生成任务 watcher：画布上带 taskId 的 loading 节点（视频等异步任务），
// 每 2s 查一次任务状态；到终态时服务端 poller 已回填节点（版本 +1），
// 前端走 syncVersion 静默重载整文档（有未保存修改则升级为冲突提示）。
import { onBeforeUnmount, onMounted } from 'vue';
import { useCanvasStore } from '../../../stores/canvas';
import { generationApi } from '../../../lib/generation-api';
import { GenerationTaskStatus } from '../../../types/ai-generation';

const POLL_INTERVAL_MS = 2000;

const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  GenerationTaskStatus.Succeeded,
  GenerationTaskStatus.Failed,
  GenerationTaskStatus.Cancelled,
]);

export function useGenerationTaskWatcher() {
  const store = useCanvasStore();
  let timer: ReturnType<typeof setInterval> | null = null;
  let polling = false;

  async function pollOnce() {
    if (polling || !store.loaded) return;
    const pendingNodes = store.nodes.filter(
      (n) => n.metadata?.taskId && n.metadata?.status === 'loading',
    );
    if (!pendingNodes.length) return;
    polling = true;
    try {
      for (const node of pendingNodes) {
        const taskId = node.metadata?.taskId;
        if (!taskId) continue;
        try {
          const task = await generationApi.getTask(taskId);
          if (TERMINAL_STATUSES.has(task.status)) {
            await store.syncVersion();
          }
        } catch {
          // 单次查询失败（网络抖动等）下一轮再试
        }
      }
    } finally {
      polling = false;
    }
  }

  onMounted(() => {
    timer = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
  });

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
  });
}
