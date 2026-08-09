import api from './api'
import type { Asset, AssetKind, AssetListResponse, CreateAssetPayload } from '../types/asset'

export const assetsApi = {
  list: async (query: { kind?: AssetKind; keyword?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<AssetListResponse>('/assets', { params: query })
    return data
  },

  create: async (payload: CreateAssetPayload) => {
    const { data } = await api.post<Asset>('/assets', payload)
    return data
  },

  remove: async (id: string) => {
    await api.delete(`/assets/${id}`)
  },
}
