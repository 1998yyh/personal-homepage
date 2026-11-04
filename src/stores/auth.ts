import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { browserSession } from '../lib/browser-session'

export const useAuthStore = defineStore('auth', () => {
  const state = shallowRef(browserSession.state)
  const error = shallowRef('')
  browserSession.subscribe(value => { state.value = value })
  const user = computed(() => state.value.user)
  const apps = computed(() => state.value.apps)
  const isAuthenticated = computed(() => !!user.value)
  const isLoading = computed(() => !state.value.ready && !error.value)
  async function fetchProfile() {
    error.value = ''
    try { await browserSession.restore() }
    catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) error.value = cause instanceof Error ? cause.message : '暂时无法验证登录状态' }
  }
  async function login(name: string, password: string, remember = false) { error.value = ''; await browserSession.login(name, password, remember) }
  async function logout() { await browserSession.logout() }
  return { user, apps, isAuthenticated, isLoading, error, fetchProfile, login, logout }
})
