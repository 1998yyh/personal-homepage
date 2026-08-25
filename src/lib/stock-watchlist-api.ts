import api from './api'
import type {
  WatchlistAddInput,
  WatchlistAddResponse,
  WatchlistCheckResponse,
  WatchlistItem,
} from '../types/stock-watchlist'

// 观察池接口：全部需登录（池子为登录用户私有）
const stockWatchlistApi = {
  /** 我的观察池（triggered 排前；响应为 { items } 包裹） */
  async list(): Promise<WatchlistItem[]> {
    const { data } = await api.get<{ items: WatchlistItem[] }>('/stock-watchlist')
    return data.items
  },

  /** 批量入池：后端做主板校验/去重/100 上限/入池即时 S 判定 */
  async add(items: WatchlistAddInput[]): Promise<WatchlistAddResponse> {
    const { data } = await api.post<WatchlistAddResponse>('/stock-watchlist', { items })
    return data
  },

  /** 移除出池（「标红自己剔除」的唯一收场动作） */
  async remove(id: string): Promise<void> {
    await api.delete(`/stock-watchlist/${id}`)
  },

  /** 手动立即检查：刷新池内股票当日数据并跑 S 评估 */
  async check(): Promise<WatchlistCheckResponse> {
    const { data } = await api.post<WatchlistCheckResponse>('/stock-watchlist/check')
    return data
  },
}

export default stockWatchlistApi
