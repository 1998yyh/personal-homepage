import axios from 'axios'
import { browserSession } from './browser-session'
export type { SessionUser as User } from './browser-session'

declare module 'axios' { interface InternalAxiosRequestConfig { authRevision?: number } }
// 业务接口从本站反代进入，不再使用明文 IP/端口兜底或保存 Bearer token。
const api = axios.create({ baseURL: '/api', withCredentials: true })
api.interceptors.request.use(async config => {
  const headers = config.url === '/auth/register' ? {} : await browserSession.prepare(config.method ?? 'GET')
  for (const [key, value] of Object.entries(headers)) config.headers.set(key, value)
  config.authRevision = browserSession.state.revision
  return config
})
api.interceptors.response.use(response => {
  browserSession.assertRevision(response.config.authRevision ?? browserSession.state.revision)
  return response
}, error => {
  const revision = error.config?.authRevision
  if (typeof revision === 'number') {
    browserSession.assertRevision(revision)
    if (error.response?.status === 401) browserSession.unauthorized(revision)
  }
  return Promise.reject(error)
})
export interface RegisterData { email: string; username: string; password: string }
// 迁移窗口兼容已有注册协议；返回的旧 JWT 不读取、不保存，另建浏览器会话。
export const authApi = { register: (data: RegisterData) => api.post<void>('/auth/register', data) }
export default api
