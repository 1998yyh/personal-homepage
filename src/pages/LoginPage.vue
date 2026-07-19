<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../lib/api'

const login = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true
  try {
    const { data } = await authApi.login({ login: login.value, password: password.value })
    await auth.login(data.accessToken, data.refreshToken)
    router.push((route.query.redirect as string) || '/')
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string }>
    error.value = axiosErr.response?.data?.message || '登录失败，请检查邮箱/用户名和密码'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-mesh flex items-center justify-center p-4 relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>

    <!-- 登录卡片 -->
    <div class="w-full max-w-md relative z-10">
      <div class="glass-dark rounded-3xl p-8 shadow-2xl">
        <!-- Logo & 标题 -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 mb-4 shadow-lg shadow-primary-500/30">
            <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-3xl font-display font-bold text-white mb-2">欢迎回来</h1>
          <p class="text-dark-300">登录你的账户继续探索</p>
        </div>

        <!-- 表单 -->
        <form class="space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium text-dark-200 mb-2">
              邮箱或用户名
            </label>
            <input
              v-model="login"
              type="text"
              class="input-glass"
              placeholder="输入邮箱或用户名"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-200 mb-2">
              密码
            </label>
            <input
              v-model="password"
              type="password"
              class="input-glass"
              placeholder="输入密码"
              required
            />
          </div>

          <div v-if="error" class="error-message">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="btn-primary flex items-center justify-center gap-2"
          >
            <template v-if="isLoading">
              <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              登录中...
            </template>
            <template v-else>登录</template>
          </button>
        </form>

        <!-- 分割线 -->
        <div class="flex items-center gap-4 my-6">
          <div class="flex-1 h-px bg-white/10"></div>
          <span class="text-dark-400 text-sm">或</span>
          <div class="flex-1 h-px bg-white/10"></div>
        </div>

        <!-- 注册链接 -->
        <p class="text-center text-dark-300">
          还没有账户？
          <router-link
            to="/register"
            class="text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            立即注册
          </router-link>
        </p>
      </div>

      <!-- 底部信息 -->
      <p class="text-center text-dark-400 text-sm mt-6">
        © 2026 Web Tools. All rights reserved.
      </p>
    </div>
  </div>
</template>
