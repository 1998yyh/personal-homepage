// 生成台「结果存素材」共享逻辑（纯前端闭环，含成败 toast）。
// pane 与历史页共用，避免重复。音频无对应 AssetKind 时静默跳过（capabilityToAssetKind 返 null）。
import { assetsApi } from '../assets-api'
import { showToast } from '../../composables/useToast'
import { capabilityToAssetKind } from './params'
import type { ModelCapability } from '../../types/ai-generation'

export async function saveMediaAsAsset(
  capability: ModelCapability,
  mediaId: string,
  title: string,
): Promise<void> {
  const kind = capabilityToAssetKind(capability)
  if (!kind) return
  try {
    await assetsApi.create({ kind, title: title || '生成结果', mediaId })
    showToast('已存入素材库', 'success')
  } catch {
    showToast('存素材失败，请稍后重试', 'error')
  }
}
