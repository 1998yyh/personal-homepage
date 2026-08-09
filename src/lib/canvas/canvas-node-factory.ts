// Ported from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/lib/canvas/canvas-node-factory.ts + web/src/constant/canvas.ts（NODE_SPECS）
// 改造点：
// - i18n.t(...) → 中文标题硬编码
// - UploadedImage/UploadedFile → 后端 MediaFileView
// - 裁掉插件节点 registry 解析与生成配置元数据 builder（Phase 4 按需补）
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeMetadata, type CanvasNodeTypeId, type Position } from '../../types/canvas';
import type { MediaFileView } from '../../types/media';
import { nodeSizeFromRatio } from './canvas-node-size';

type CanvasNodeSpec = {
  width: number;
  height: number;
  title: string;
  metadata?: CanvasNodeMetadata;
};

export const NODE_DEFAULT_SIZE: Record<CanvasNodeType, { width: number; height: number; title: string }> = {
  [CanvasNodeType.Image]: { width: 340, height: 240, title: '图片' },
  [CanvasNodeType.Text]: { width: 340, height: 240, title: '文本' },
  [CanvasNodeType.Config]: { width: 340, height: 240, title: '生成配置' },
  [CanvasNodeType.Video]: { width: 420, height: 236, title: '视频' },
  [CanvasNodeType.Audio]: { width: 340, height: 120, title: '音频' },
  [CanvasNodeType.Group]: { width: 760, height: 480, title: '分组' },
};

export const NODE_SPECS: Record<CanvasNodeType, CanvasNodeSpec> = {
  [CanvasNodeType.Image]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Image], metadata: { content: '', status: 'idle' } },
  [CanvasNodeType.Text]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Text], metadata: { content: '', status: 'idle', fontSize: 14 } },
  [CanvasNodeType.Config]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Config], metadata: { content: '', status: 'idle', generationMode: 'image' } },
  [CanvasNodeType.Video]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Video], metadata: { content: '', status: 'idle' } },
  [CanvasNodeType.Audio]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Audio], metadata: { content: '', status: 'idle' } },
  [CanvasNodeType.Group]: { ...NODE_DEFAULT_SIZE[CanvasNodeType.Group], metadata: { status: 'idle' } },
};

const FALLBACK_SPEC: CanvasNodeSpec = { width: 340, height: 240, title: '节点', metadata: { content: '', status: 'idle' } };

// 未知类型（历史文档残留等）回退为通用规格
export function getNodeSpec(type: string): CanvasNodeSpec {
  return NODE_SPECS[type as CanvasNodeType] || FALLBACK_SPEC;
}

export function createCanvasNode(type: CanvasNodeTypeId, position: Position, metadata?: CanvasNodeMetadata): CanvasNodeData {
  const spec = getNodeSpec(type);
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    type,
    title: spec.title,
    position: {
      x: position.x - spec.width / 2,
      y: position.y - spec.height / 2,
    },
    width: spec.width,
    height: spec.height,
    metadata: { ...spec.metadata, ...metadata },
  };
}

export function imageMetadata(media: MediaFileView): CanvasNodeMetadata {
  return {
    content: media.url,
    storageKey: media.fileName,
    mediaId: media.id,
    status: 'success',
    naturalWidth: media.width || undefined,
    naturalHeight: media.height || undefined,
    bytes: media.bytes,
    mimeType: media.mimeType,
  };
}

export function videoMetadata(media: MediaFileView): CanvasNodeMetadata {
  return {
    content: media.url,
    storageKey: media.fileName,
    mediaId: media.id,
    status: 'success',
    naturalWidth: media.width || undefined,
    naturalHeight: media.height || undefined,
    bytes: media.bytes,
    mimeType: media.mimeType || 'video/mp4',
    durationMs: media.durationMs || undefined,
  };
}

export function audioMetadata(media: MediaFileView): CanvasNodeMetadata {
  return {
    content: media.url,
    storageKey: media.fileName,
    mediaId: media.id,
    status: 'success',
    bytes: media.bytes,
    mimeType: media.mimeType || 'audio/mpeg',
    durationMs: media.durationMs || undefined,
  };
}

// config 节点元数据 patch：空内容图片/视频节点按 size 比例同步调整节点尺寸（居中保持）
export function applyNodeConfigPatch(node: CanvasNodeData, patch: Partial<CanvasNodeData['metadata']>) {
  const safePatch = patch || {};
  const next = { ...node, metadata: { ...node.metadata, ...safePatch } };
  const spec = node.type === CanvasNodeType.Video ? NODE_DEFAULT_SIZE[CanvasNodeType.Video] : NODE_DEFAULT_SIZE[CanvasNodeType.Image];
  const size = typeof safePatch.size === 'string' && !node.metadata?.content ? nodeSizeFromRatio(safePatch.size, spec.width, spec.height) : null;
  return size && (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video)
    ? {
        ...next,
        ...size,
        position: { x: node.position.x + node.width / 2 - size.width / 2, y: node.position.y + node.height / 2 - size.height / 2 },
      }
    : next;
}
