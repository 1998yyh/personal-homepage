import { defineStore } from 'pinia'
import { authApi } from '../lib/api'
import type { User } from '../lib/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    isLoading: true,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    async fetchProfile() {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        this.isLoading = false
        return
      }
      try {
        const { data } = await authApi.getProfile()
        this.user = data
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      } finally {
        this.isLoading = false
      }
    },
    async login(accessToken: string, refreshToken: string) {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      await this.fetchProfile()
    },
    logout() {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      this.user = null
    },
  },
})
