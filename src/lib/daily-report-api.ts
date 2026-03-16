import api from './api';
import type { DailyReport, DailyReportListResponse, DailyReportType } from '../types/daily-report';

export const dailyReportsApi = {
  getList: async (params?: { type?: DailyReportType; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const { data } = await api.get<DailyReportListResponse>(`/daily-reports?${query.toString()}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<DailyReport>(`/daily-reports/${id}`);
    return data;
  },

  getDates: async (type: DailyReportType) => {
    const { data } = await api.get<string[]>(`/daily-reports/dates/${type}`);
    return data;
  },

  getLatest: async (type: DailyReportType) => {
    const { data } = await api.get<DailyReport | null>(`/daily-reports/latest/${type}`);
    return data;
  },

  create: async (report: { type: DailyReportType; title: string; date: string; content: string }) => {
    const { data } = await api.post<DailyReport>('/daily-reports', report);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/daily-reports/${id}`);
  },
};

export default dailyReportsApi;