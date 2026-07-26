<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../lib/api'
import AuthShell from '../components/AuthShell.vue'
import AppIcon from '../components/AppIcon.vue'

type FieldKey = 'login' | 'password'

const login = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const isLoading = ref(false)
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// 字段级状态（登录只有非空约束，出错后输入即清除）
const fieldState = reactive<Record<FieldKey, { status: '' | 'err'; msg: string }>>({
  login: { status: '', msg: '' },
  password: { status: '', msg: '' },
})
const values: Record<FieldKey, typeof login> = { login, password }
const emptyMsg: Record<FieldKey, string> = { login: '请输入邮箱或用户名', password: '请输入密码' }

const fieldInputs = new Map<FieldKey, HTMLInputElement>()
const setFieldInput = (key: FieldKey) => (el: unknown) => {
  if (el instanceof HTMLInputElement) fieldInputs.set(key, el)
}

const clearField = (key: FieldKey) => {
  fieldState[key].status = ''
  fieldState[key].msg = ''
}
const onFieldBlur = (key: FieldKey) => {
  if (values[key].value.trim()) clearField(key)
}
const onFieldInput = (key: FieldKey) => {
  if (fieldState[key].status === 'err' && values[key].value.trim()) clearField(key)
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
  fieldInputs.get('password')?.focus()
}

// 聚焦并弹簧提示首个问题字段
const shakeAndFocus = (key: FieldKey) => {
  const input = fieldInputs.get(key)
  input?.focus()
  const box = input?.closest('.field')
  if (box) {
    box.classList.remove('anim-shake')
    void (box as HTMLElement).offsetWidth
    box.classList.add('anim-shake')
  }
}

const handleSubmit = async () => {
  error.value = ''

  let firstBad: FieldKey | null = null
  for (const key of ['login', 'password'] as FieldKey[]) {
    if (!values[key].value.trim()) {
      fieldState[key].status = 'err'
      fieldState[key].msg = emptyMsg[key]
      if (!firstBad) firstBad = key
    } else {
      clearField(key)
    }
  }
  if (firstBad) {
    shakeAndFocus(firstBad)
    return
  }

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
  <AuthShell lede="欢迎回来——今日的情报与复盘已经备好。">
    <div class="auth-logo anim-rise d1">
      <h1>欢迎回来</h1>
      <p>登录你的账户继续探索</p>
    </div>

    <form
      class="auth-form anim-rise d2"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <div class="field">
        <label
          class="od-label"
          for="login"
        >邮箱或用户名</label>
        <input
          id="login"
          :ref="setFieldInput('login')"
          v-model="login"
          type="text"
          class="od-input"
          :class="fieldState.login.status"
          placeholder="输入邮箱或用户名"
          autocomplete="username"
          @blur="onFieldBlur('login')"
          @input="onFieldInput('login')"
        >
        <p
          class="field-msg"
          :class="fieldState.login.status"
        >
          <AppIcon
            v-if="fieldState.login.msg"
            name="alert-circle"
            :size="13"
          />
          <span>{{ fieldState.login.msg }}</span>
        </p>
      </div>

      <div class="field">
        <label
          class="od-label"
          for="password"
        >密码</label>
        <div class="pwd-wrap">
          <input
            id="password"
            :ref="setFieldInput('password')"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="od-input"
            :class="fieldState.password.status"
            placeholder="输入密码"
            autocomplete="current-password"
            @blur="onFieldBlur('password')"
            @input="onFieldInput('password')"
          >
          <button
            type="button"
            class="pwd-toggle"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            @click="togglePassword"
          >
            <AppIcon
              :name="showPassword ? 'eye-off' : 'eye'"
              :size="17"
            />
          </button>
        </div>
        <p
          class="field-msg"
          :class="fieldState.password.status"
        >
          <AppIcon
            v-if="fieldState.password.msg"
            name="alert-circle"
            :size="13"
          />
          <span>{{ fieldState.password.msg }}</span>
        </p>
      </div>

      <div
        v-if="error"
        class="od-error with-icon"
      >
        <AppIcon
          name="alert-circle"
          :size="16"
        />
        <span>{{ error }}</span>
      </div>

      <button
        type="submit"
        class="od-btn od-btn-primary od-btn-lg od-btn-block"
        :disabled="isLoading"
      >
        {{ isLoading ? '登录中...' : '登录' }}
      </button>
    </form>

    <div class="auth-divider anim-rise d3">
      <span>或</span>
    </div>
    <p class="auth-switch anim-rise d4">
      还没有账户？ <router-link to="/register">
        立即注册
      </router-link>
    </p>
    <p class="auth-foot anim-rise d5">
      © 2026 Web Tools · 全站匿名可访问，登录用于展示个人信息
    </p>
  </AuthShell>
</template>
