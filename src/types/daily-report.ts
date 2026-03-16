export type DailyReportType = 'ai' | 'stock';

export interface DailyReport {
  id: string;
  type: DailyReportType;
  title: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportListResponse {
  items: DailyReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}