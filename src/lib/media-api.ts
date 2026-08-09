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
const apiOrigin = new URL(api.defaults.baseURL || 'http://43.140.214.49:3000/api').origin;

export function mediaUrl(url: string) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${apiOrigin}${url}`;
}
