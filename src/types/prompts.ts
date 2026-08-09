// 提示词库类型（对应 tuanzi-server-base 的 prompts 模块）

export interface Prompt {
  id: string
  title: string
  prompt: string
  description: string
  coverUrl: string
  referenceImageUrls: string[]
  tags: string[]
  preview: string
  createdAt: string
  updatedAt: string
  author?: string
  sourceUrl?: string
  imageMode?: string
  imageModel?: string
  imageSize?: string
  imageCount?: number
  sourceId: string
  /** 源名称（即分类） */
  category: string
  githubUrl: string
}

export interface PromptListResponse {
  items: Prompt[]
  tags: string[]
  categories: string[]
  total: number
}

export interface PromptSourceView {
  id: string
  /** null = 内置源（共享只读） */
  userId: string | null
  name: string
  url: string
  homepage: string
  isBuiltin: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PromptSourceStatus {
  sourceId: string
  count: number
  lastSuccessAt: string
  lastError: string
}

export interface PromptSourceRefreshResult extends PromptSourceStatus {
  sourceName: string
  success: boolean
}

export interface PromptSourceRefreshSummary {
  results: PromptSourceRefreshResult[]
  total: number
  successCount: number
  failureCount: number
}

export interface PromptSourcePayload {
  name: string
  url: string
  homepage?: string
}

export const ALL_PROMPTS_OPTION = 'all'
