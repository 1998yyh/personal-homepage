import type { CanvasDocument } from './canvas';

// 与后端 tuanzi-server-base canvas 模块的响应形状一一对应

export interface CanvasProjectView {
  id: string;
  userId: string;
  name: string;
  document: CanvasDocument;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** 列表项：不带 document 整文档，只给计数摘要 */
export interface CanvasProjectSummary {
  id: string;
  userId: string;
  name: string;
  version: number;
  nodeCount: number;
  connectionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasProjectListResponse {
  items: CanvasProjectSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
