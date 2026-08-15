import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://43.140.214.49:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误和 token 刷新
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 错误且不是刷新 token 的请求，尝试刷新 token
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshTokens();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        // 刷新失败：静默登出（全站公开访问，不再强制跳登录页）。
        // 动态引入避免循环依赖：stores/auth.ts 静态依赖本模块的 authApi。
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        const { useAuthStore } = await import('../stores/auth');
        useAuthStore().logout();
      }
    }

    return Promise.reject(error);
  }
);

/**
 * 单飞刷新：并发 401 只发一次 /auth/refresh，其余请求等待同一 promise。
 * 后端 refreshToken 每次刷新都会轮换，并发各自刷新会互相顶掉新 token 导致误登出。
 * 失败时所有等待方共享失败（同一 catch 路径静默登出）。
 */
let refreshPromise: Promise<string> | null = null;

async function refreshTokens(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return Promise.reject(new Error('缺少 refreshToken'));
  refreshPromise = api
    .post<AuthResponse>('/auth/refresh', { refreshToken })
    .then(({ data }) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  login: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  /** 用户角色（MCP stdio 配置等管理员能力的前端判断依据） */
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export const authApi = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: LoginData) =>
    api.post<AuthResponse>('/auth/login', data),

  getProfile: () =>
    api.get<User>('/auth/profile'),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }),
};

export default api;