<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../lib/api'

const email = ref('')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const isLoading = ref(false)
const router = useRouter()
const auth = useAuthStore()

const validateForm = () => {
  if (!email.value.includes('@')) {
    error.value = '请输入有效的邮箱地址'
    return false
  }
  if (username.value.length < 3) {
    error.value = '用户名至少需要3个字符'
    return false
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username.value)) {
    error.value = '用户名只能包含字母、数字和下划线'
    return false
  }
  if (password.value.length < 6) {
    error.value = '密码至少需要6个字符'
    return false
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return false
  }
  return true
}

const handleSubmit = async () => {
  error.value = ''

  if (!validateForm()) return

  isLoading.value = true
  try {
    const { data } = await authApi.register({ email: email.value, username: username.value, password: password.value })
    await auth.login(data.accessToken, data.refreshToken)
    router.push('/')
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string }>
    error.value = axiosErr.response?.data?.message || '注册失败，请稍后重试'
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

    <!-- 注册卡片 -->
    <div class="w-full max-w-md relative z-10">
      <div class="glass-dark rounded-3xl p-8 shadow-2xl">
        <!-- Logo & 标题 -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-primary-600 mb-4 shadow-lg shadow-cyan-500/30">
            <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 class="text-3xl font-display font-bold text-white mb-2">创建账户</h1>
          <p class="text-dark-300">开始你的探索之旅</p>
        </div>

        <!-- 表单 -->
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium text-dark-200 mb-2">
              邮箱
            </label>
            <input
              v-model="email"
              type="email"
              class="input-glass"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-200 mb-2">
              用户名
            </label>
            <input
              v-model="username"
              type="text"
              class="input-glass"
              placeholder="3-20个字符，字母数字下划线"
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
              placeholder="至少6个字符"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-200 mb-2">
              确认密码
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              class="input-glass"
              placeholder="再次输入密码"
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
            class="btn-primary flex items-center justify-center gap-2 mt-6"
          >
            <template v-if="isLoading">
              <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              注册中...
            </template>
            <template v-else>创建账户</template>
          </button>
        </form>

        <!-- 分割线 -->
        <div class="flex items-center gap-4 my-6">
          <div class="flex-1 h-px bg-white/10"></div>
          <span class="text-dark-400 text-sm">或</span>
          <div class="flex-1 h-px bg-white/10"></div>
        </div>

        <!-- 登录链接 -->
        <p class="text-center text-dark-300">
          已有账户？
          <router-link
            to="/login"
            class="text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            立即登录
          </router-link>
        </p>
      </div>

      <!-- 底部信息 -->
      <p class="text-center text-dark-400 text-sm mt-6">
        注册即表示同意我们的服务条款和隐私政策
      </p>
    </div>
  </div>
</template>
