// 生成台模型二级选择器纯逻辑层：按能力从渠道拉平出可选模型。
// 不动画布——画布 NodeConfigContent 内联了同款逻辑，此处抽为可复用纯函数。
import type { AiChannelView, ModelCapability } from '../../types/ai-generation'
import { toModelRef } from '../channels-api'

export interface ModelOption {
  /** modelRef = "channelId::modelName" */
  value: string
  /** 展示名："渠道名 · 模型名" */
  label: string
}

/** 从渠道列表按能力拉平出可选模型（只取启用中的渠道） */
export function modelOptionsFor(
  channels: AiChannelView[] | undefined,
  capability: ModelCapability,
): ModelOption[] {
  return (channels ?? [])
    .filter((c) => c.isActive)
    .flatMap((c) =>
      c.models
        .filter((m) => m.capability === capability)
        .map((m) => ({ value: toModelRef(c.id, m.name), label: `${c.name} · ${m.name}` })),
    )
}
