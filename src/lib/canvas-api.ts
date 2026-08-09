import api from './api';
import type { CanvasDocument } from '../types/canvas';
import type { CanvasProjectListResponse, CanvasProjectView } from '../types/canvas-api';

// 画布项目 API（后端 tuanzi-server-base /canvas-projects）
// 整文档保存带 baseVersion 乐观锁：409 时由调用方（canvas store）重新拉取
export const canvasApi = {
  list: async (params?: { page?: number; limit?: number; keyword?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.keyword) query.append('keyword', params.keyword);
    const { data } = await api.get<CanvasProjectListResponse>(`/canvas-projects?${query.toString()}`);
    return data;
  },

  create: async (name: string) => {
    const { data } = await api.post<CanvasProjectView>('/canvas-projects', { name });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<CanvasProjectView>(`/canvas-projects/${id}`);
    return data;
  },

  /** 仅取版本号（静默比对用，避免整文档传输） */
  getVersion: async (id: string) => {
    const { data } = await api.get<{ version: number }>(`/canvas-projects/${id}/version`);
    return data;
  },

  rename: async (id: string, name: string) => {
    const { data } = await api.patch<CanvasProjectView>(`/canvas-projects/${id}`, { name });
    return data;
  },

  updateDocument: async (id: string, document: CanvasDocument, baseVersion: number) => {
    const { data } = await api.put<CanvasProjectView>(`/canvas-projects/${id}`, { document, baseVersion });
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/canvas-projects/${id}`);
  },
};
