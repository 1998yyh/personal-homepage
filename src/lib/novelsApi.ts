import axios from 'axios';

const API_BASE = 'http://43.140.214.49:3000/api';

const novelsApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
novelsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface NovelListParams {
  page?: number;
  limit?: number;
}

// GET /novels?page=1&limit=10
export const getNovels = async (page = 1, limit = 10) => {
  const response = await novelsApi.get('/novels', {
    params: { page, limit },
  });
  return response.data;
};

// GET /novels/:id
export const getNovel = async (id: number) => {
  const response = await novelsApi.get(`/novels/${id}`);
  return response.data;
};

// GET /novels/:id/chapters
export const getChapters = async (novelId: number) => {
  const response = await novelsApi.get(`/novels/${novelId}/chapters`);
  return response.data;
};

// GET /novels/:id/chapters/:chapterId
export const getChapter = async (novelId: number, chapterId: number) => {
  const response = await novelsApi.get(`/novels/${novelId}/chapters/${chapterId}`);
  return response.data;
};

export default novelsApi;