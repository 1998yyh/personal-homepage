import type { MediaFileView } from './media'

// 素材库类型（对应 tuanzi-server-base 的 assets 模块）
export const AssetKind = {
  Text: 'text',
  Image: 'image',
  Video: 'video',
} as const
export type AssetKind = (typeof AssetKind)[keyof typeof AssetKind]

export interface Asset {
  id: string
  userId: string
  kind: AssetKind
  title: string
  textContent: string | null
  mediaId: string | null
  media: MediaFileView | null
  tags: string[] | null
  source: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface AssetListResponse {
  items: Asset[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateAssetPayload {
  kind: AssetKind
  title: string
  textContent?: string
  mediaId?: string
  tags?: string[]
  source?: string
  note?: string
}
