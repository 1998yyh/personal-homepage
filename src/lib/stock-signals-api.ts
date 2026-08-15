import api from './api';
import type {
  DailySignalsResult,
  ScanRequestResponse,
  ScanRunStatusResponse,
  SignalDateEntry,
} from '../types/stock-signal';

export const stockSignalsApi = {
  /** 发起扫描（需登录）：全市场 → 异步任务；传 codes → 同步抓取 */
  requestScan: async (payload: { date?: string; codes?: string[]; refresh?: boolean }) => {
    const { data } = await api.post<ScanRequestResponse>('/stock-signals/scans', payload);
    return data;
  },

  /** 任务状态轮询（公开） */
  getRun: async (id: string) => {
    const { data } = await api.get<ScanRunStatusResponse>(`/stock-signals/scans/${id}`);
    return data;
  },

  /** 某日结果（公开；未扫描 404） */
  getByDate: async (date: string) => {
    const { data } = await api.get<DailySignalsResult>('/stock-signals', { params: { date } });
    return data;
  },

  /** 历史日期列表（公开） */
  getDates: async () => {
    const { data } = await api.get<SignalDateEntry[]>('/stock-signals/dates');
    return data;
  },
};
export default stockSignalsApi;
