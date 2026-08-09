// Ported from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/types/canvas.ts
// 改造点：裁掉 CanvasAssistant* 会话类型（浏览器端 Agent 方案不迁移）；metadata 增加 taskId（服务端生成任务回填扩展）

export type Position = {
  x: number;
  y: number;
};

export type ViewportTransform = {
  x: number;
  y: number;
  k: number;
};

// erasableSyntaxOnly 开启，不能用 enum：const 对象 + 同名类型别名
export const CanvasNodeType = {
  Image: 'image',
  Text: 'text',
  Config: 'config',
  Video: 'video',
  Audio: 'audio',
  Group: 'group',
} as const;
export type CanvasNodeType = (typeof CanvasNodeType)[keyof typeof CanvasNodeType];

// 节点类型开放为字符串：内置类型用 CanvasNodeType，其余为未知/未来扩展类型
export type CanvasNodeTypeId = CanvasNodeType | (string & {});

export type CanvasNodeStatus = 'idle' | 'success' | 'loading' | 'error';
export type CanvasGenerationMode = 'text' | 'image' | 'video' | 'audio';
export type CanvasImageGenerationType = 'generation' | 'edit';

export type CanvasNodeMetadata = {
  content?: string;
  composerContent?: string;
  prompt?: string;
  status?: CanvasNodeStatus;
  errorDetails?: string;
  fontSize?: number;
  generationMode?: CanvasGenerationMode;
  generationType?: CanvasImageGenerationType;
  model?: string;
  reasoningEffort?: 'auto' | 'low' | 'medium' | 'high' | 'xhigh';
  size?: string;
  quality?: string;
  background?: string;
  count?: number;
  seconds?: string;
  vquality?: string;
  generateAudio?: string;
  watermark?: string;
  audioVoice?: string;
  audioFormat?: string;
  audioSpeed?: string;
  audioInstructions?: string;
  references?: string[];
  naturalWidth?: number;
  naturalHeight?: number;
  freeResize?: boolean;
  isBatchRoot?: boolean;
  batchRootId?: string;
  batchChildIds?: string[];
  batchUsesReferenceImages?: boolean;
  primaryImageId?: string;
  imageBatchExpanded?: boolean;
  storageKey?: string;
  mimeType?: string;
  bytes?: number;
  durationMs?: number;
  groupId?: string;
  interactive?: boolean;
  /** 服务端扩展：关联的 generation_tasks.id（生成回填轮询用） */
  taskId?: string;
  /** 服务端扩展：节点内容对应的 media_files.id（作为生成参考素材用） */
  mediaId?: string;
};

export type CanvasNodeData = {
  id: string;
  type: CanvasNodeTypeId;
  title: string;
  position: Position;
  width: number;
  height: number;
  metadata?: CanvasNodeMetadata;
};

export type CanvasConnection = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
};

// 画布整文档结构，与后端 canvas_projects.document JSON 列一一对应
export type CanvasDocument = {
  nodes: CanvasNodeData[];
  connections: CanvasConnection[];
  viewport?: ViewportTransform;
};

export const EMPTY_CANVAS_DOCUMENT: CanvasDocument = { nodes: [], connections: [] };

export type ConnectionHandle = {
  nodeId: string;
  handleType: 'source' | 'target';
};

export type SelectionBox = {
  startWorldX: number;
  startWorldY: number;
  currentWorldX: number;
  currentWorldY: number;
  additive: boolean;
  initialSelectedNodeIds: string[];
};

export type ContextMenuState =
  | {
      type: 'node';
      x: number;
      y: number;
      nodeId: string;
    }
  | {
      type: 'connection';
      x: number;
      y: number;
      connectionId: string;
    };

export type CanvasBackgroundMode = 'dots' | 'lines' | 'blank';
