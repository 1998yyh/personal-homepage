// AI 生成模块共享类型（对应 tuanzi-server-base 的 ai-generation 模块）
// erasableSyntaxOnly 约束：不用 enum，用 const 对象 + 类型别名

export const ApiFormat = {
  OpenAI: 'openai',
  Gemini: 'gemini',
  Ark: 'ark',
  Anthropic: 'anthropic',
} as const
export type ApiFormat = (typeof ApiFormat)[keyof typeof ApiFormat]

export const ModelCapability = {
  Image: 'image',
  Video: 'video',
  Audio: 'audio',
  Chat: 'chat',
} as const
export type ModelCapability = (typeof ModelCapability)[keyof typeof ModelCapability]

export interface ChannelModel {
  name: string
  capability: ModelCapability
}

export interface AiChannelView {
  id: string
  userId: string
  name: string
  apiFormat: ApiFormat
  baseUrl: string
  /** 脱敏值，如 sk-****1234；编辑时留空表示不修改 */
  apiKeyMasked: string
  models: ChannelModel[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ChannelPayload {
  name: string
  apiFormat: ApiFormat
  baseUrl: string
  /** 编辑时留空 = 保持原值（后端契约） */
  apiKey?: string
  models: ChannelModel[]
  isActive?: boolean
}

// ---- 生成任务 ----

export const GenerationTaskStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Succeeded: 'succeeded',
  Failed: 'failed',
  Cancelled: 'cancelled',
} as const
export type GenerationTaskStatus = (typeof GenerationTaskStatus)[keyof typeof GenerationTaskStatus]

export interface GenerationNodeRef {
  projectId: string
  nodeId: string
}

export interface GenerationTaskView {
  id: string
  userId: string
  channelId: string
  model: string
  capability: ModelCapability
  status: GenerationTaskStatus
  prompt: string
  params: Record<string, unknown> | null
  remoteTaskId: string | null
  resultMediaId: string | null
  resultMedia: import('./media').MediaFileView | null
  resultExtra: Record<string, unknown> | null
  error: string | null
  nodeRef: GenerationNodeRef | null
  createdAt: string
  updatedAt: string
}

export interface GenerateImagePayload {
  modelRef: string
  prompt: string
  count?: number
  quality?: string
  size?: string
  background?: string
  systemPrompt?: string
  referenceMediaIds?: string[]
  nodeRef?: GenerationNodeRef
}

export interface GenerateVideoPayload {
  modelRef: string
  prompt: string
  seconds?: string
  size?: string
  vquality?: string
  generateAudio?: string
  watermark?: string
  referenceMediaIds?: string[]
  nodeRef?: GenerationNodeRef
}

export interface GenerateAudioPayload {
  modelRef: string
  prompt: string
  voice?: string
  format?: string
  speed?: string
  instructions?: string
  nodeRef?: GenerationNodeRef
}

export interface GenerationTaskListResponse {
  items: GenerationTaskView[]
  total: number
  page: number
  limit: number
  totalPages: number
}
