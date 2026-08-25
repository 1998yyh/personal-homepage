import api from './api';
import type { MediaFileView } from '../types/media';

// 媒体文件 API（后端 /media：上传 + 查询）
export const mediaApi = {
  /** 上传图片/视频/音频（multipart，50MB 上限由后端拦截） */
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<MediaFileView>('/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<MediaFileView>(`/media/${id}`);
    return data;
  },
};

// 后端 /uploads 静态目录在 /api 前缀之外，相对路径需补 API origin
// 带 base 解析 + 兜底：baseURL 是相对路径（/api 同域反代部署）或非法值时
// 不能在这里炸掉——本行在模块顶层执行，一炸会连累所有 import 本模块的页面加载
function resolveApiOrigin(): string {
  const base = api.defaults.baseURL || 'http://43.140.214.49:3000/api';
  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    console.warn(`[media-api] VITE_API_URL「${base}」不是合法 URL，媒体地址将回退当前站点源`);
    return window.location.origin;
  }
}

const apiOrigin = resolveApiOrigin();

export function mediaUrl(url: string) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${apiOrigin}${url}`;
}
