// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/pages/canvas/project.tsx 的生成胶水（requestGeneration/requestVideoGeneration 编排）
// 改造点：浏览器直连 AI → 后端 /ai-generation 代理；IndexedDB 存储 → 服务端 media。
// config 节点的生成编排：收集连入的文本/媒体输入 → 调后端生成 → 落结果节点。
// 图片/音频同步返回后直接建节点；视频先建 pending 节点并落库（nodeRef 回填依赖服务端文档里有该节点），
// 再带 nodeRef 创建任务，由 generation-poller 完成回填、useGenerationTaskWatcher 触发前端刷新。
import { ref } from 'vue';
import { useCanvasStore } from '../../../stores/canvas';
import { generationApi } from '../../../lib/generation-api';
import { fitNodeSize } from '../../../lib/canvas/canvas-node-size';
import {
  audioMetadata,
  imageMetadata,
  NODE_DEFAULT_SIZE,
} from '../../../lib/canvas/canvas-node-factory';
import { CanvasNodeType, type CanvasNodeData, type Position } from '../../../types/canvas';

/** 结果节点与 config 节点的水平间距 */
const RESULT_GAP = 80;
/** 多图结果节点的垂直错位 */
const RESULT_STAGGER = 48;

function errorMessage(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error instanceof Error ? error.message : '') ||
    '生成失败，请稍后重试'
  );
}

export function useNodeGeneration() {
  const store = useCanvasStore();
  const generating = ref(false);

  /** 连入 config 节点的输入：文本节点内容拼进 prompt，媒体节点作参考素材 */
  function collectInputs(configNode: CanvasNodeData) {
    const incoming = store.connections.filter((c) => c.toNodeId === configNode.id);
    const textParts: string[] = [];
    const referenceMediaIds: string[] = [];
    for (const conn of incoming) {
      const source = store.nodes.find((n) => n.id === conn.fromNodeId);
      if (!source) continue;
      if (source.type === CanvasNodeType.Text) {
        const text = source.metadata?.content?.trim();
        if (text) textParts.push(text);
      } else if (
        (source.type === CanvasNodeType.Image ||
          source.type === CanvasNodeType.Video ||
          source.type === CanvasNodeType.Audio) &&
        source.metadata?.mediaId
      ) {
        referenceMediaIds.push(source.metadata.mediaId);
      }
    }
    const ownPrompt = configNode.metadata?.prompt?.trim() || '';
    return { prompt: [ownPrompt, ...textParts].filter(Boolean).join('\n'), referenceMediaIds };
  }

  /** 结果节点落点：config 节点右侧，按索引垂直错位 */
  function resultPosition(configNode: CanvasNodeData, index: number): Position {
    return {
      x: configNode.position.x + configNode.width + RESULT_GAP + NODE_DEFAULT_SIZE[CanvasNodeType.Image].width / 2,
      y: configNode.position.y + configNode.height / 2 + index * RESULT_STAGGER,
    };
  }

  function connectFromConfig(configNode: CanvasNodeData, targetId: string) {
    store.connectNodes({ nodeId: configNode.id, handleType: 'source' }, targetId);
  }

  async function runImage(configNode: CanvasNodeData, prompt: string, referenceMediaIds: string[]) {
    const meta = configNode.metadata || {};
    const { media } = await generationApi.generateImage({
      modelRef: meta.model || '',
      prompt,
      count: meta.count,
      quality: meta.quality,
      size: meta.size,
      background: meta.background,
      referenceMediaIds: referenceMediaIds.length ? referenceMediaIds : undefined,
    });
    media.forEach((m, index) => {
      const node = store.addNode(CanvasNodeType.Image, resultPosition(configNode, index), imageMetadata(m));
      const fitted = fitNodeSize(m.width || 640, m.height || 480);
      store.updateNode(node.id, (n) => ({
        ...n,
        width: fitted.width,
        height: fitted.height,
        position: {
          x: n.position.x + n.width / 2 - fitted.width / 2,
          y: n.position.y + n.height / 2 - fitted.height / 2,
        },
      }));
      connectFromConfig(configNode, node.id);
    });
  }

  async function runAudio(configNode: CanvasNodeData, prompt: string) {
    const meta = configNode.metadata || {};
    const { media } = await generationApi.generateAudio({
      modelRef: meta.model || '',
      prompt,
      voice: meta.audioVoice,
      format: meta.audioFormat,
      speed: meta.audioSpeed,
      instructions: meta.audioInstructions,
    });
    const node = store.addNode(CanvasNodeType.Audio, resultPosition(configNode, 0), audioMetadata(media));
    connectFromConfig(configNode, node.id);
  }

  async function runVideo(configNode: CanvasNodeData, prompt: string, referenceMediaIds: string[], projectId: string) {
    const meta = configNode.metadata || {};
    // 先建 pending 节点并落库：服务端 poller 按 nodeRef 回填时文档里必须已有该节点
    const node = store.addNode(CanvasNodeType.Video, resultPosition(configNode, 0), {
      status: 'loading',
    });
    store.updateNode(node.id, (n) => ({ ...n, title: '视频生成中…' }));
    connectFromConfig(configNode, node.id);
    await store.saveNow();
    try {
      const { task } = await generationApi.generateVideo({
        modelRef: meta.model || '',
        prompt,
        seconds: meta.seconds,
        size: meta.size,
        vquality: meta.vquality,
        generateAudio: meta.generateAudio,
        watermark: meta.watermark,
        referenceMediaIds: referenceMediaIds.length ? referenceMediaIds : undefined,
        nodeRef: { projectId, nodeId: node.id },
      });
      store.updateNodeMetadata(node.id, { taskId: task.id });
    } catch (error) {
      store.updateNode(node.id, (n) => ({ ...n, title: '视频' }));
      store.updateNodeMetadata(node.id, { status: 'error', errorDetails: errorMessage(error) });
      throw error;
    }
  }

  async function runGeneration(configNodeId: string) {
    const configNode = store.nodes.find((n) => n.id === configNodeId);
    const projectId = store.projectId;
    if (!configNode || !projectId || generating.value) return;
    const meta = configNode.metadata || {};
    const mode = meta.generationMode || 'image';
    const { prompt, referenceMediaIds } = collectInputs(configNode);
    if (!meta.model) {
      store.updateNodeMetadata(configNodeId, { status: 'error', errorDetails: '请先在配置中选择模型' });
      return;
    }
    if (!prompt) {
      store.updateNodeMetadata(configNodeId, { status: 'error', errorDetails: '请先填写提示词' });
      return;
    }

    generating.value = true;
    store.updateNodeMetadata(configNodeId, { status: 'loading', errorDetails: undefined });
    try {
      if (mode === 'video') await runVideo(configNode, prompt, referenceMediaIds, projectId);
      else if (mode === 'audio') await runAudio(configNode, prompt);
      else await runImage(configNode, prompt, referenceMediaIds);
      store.updateNodeMetadata(configNodeId, { status: 'success' });
    } catch (error) {
      store.updateNodeMetadata(configNodeId, { status: 'error', errorDetails: errorMessage(error) });
    } finally {
      generating.value = false;
    }
  }

  return { generating, runGeneration };
}
