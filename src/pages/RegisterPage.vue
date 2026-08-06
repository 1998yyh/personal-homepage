<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { AxiosError } from 'axios'
import { useAuthStore } from '../stores/auth'
import { authApi } from '../lib/api'
import AuthShell from '../components/AuthShell.vue'
import AppIcon from '../components/AppIcon.vue'

type FieldKey = 'email' | 'username' | 'password' | 'confirm'
type FieldStatus = '' | 'err' | 'ok'

const email = ref('')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const meterLevel = ref(0)
const error = ref('')
const isLoading = ref(false)
const router = useRouter()
const auth = useAuthStore()

const values: Record<FieldKey, typeof email> = { email, username, password, confirm: confirmPassword }

// 校验规则与文案：与原实现一致（邮箱含 @、用户名 ≥3 且字母数字下划线、密码 ≥6、两次一致）
const tests: Record<FieldKey, (v: string) => true | string> = {
  email: (v) => v.includes('@') || '请输入有效的邮箱地址',
  username: (v) => v.length < 3
    ? '用户名至少需要3个字符'
    : (/^[a-zA-Z0-9_]+$/.test(v) || '用户名只能包含字母、数字和下划线'),
  password: (v) => v.length >= 6 || '密码至少需要6个字符',
  confirm: (v) => v === password.value || '两次输入的密码不一致',
}
const okTexts: Partial<Record<FieldKey, string>> = { email: '邮箱格式正确', username: '用户名可用', confirm: '两次输入一致' }
// 提交时空值字段按各自的首条规则提示
const emptyTexts: Record<FieldKey, string> = {
  email: '请输入有效的邮箱地址',
  username: '用户名至少需要3个字符',
  password: '密码至少需要6个字符',
  confirm: '两次输入的密码不一致',
}

const fieldState = reactive<Record<FieldKey, { status: FieldStatus; msg: string }>>({
  email: { status: '', msg: '' },
  username: { status: '', msg: '' },
  password: { status: '', msg: '' },
  confirm: { status: '', msg: '' },
})

const fieldInputs = new Map<FieldKey, HTMLInputElement>()
const setFieldInput = (key: FieldKey) => (el: unknown) => {
  if (el instanceof HTMLInputElement) fieldInputs.set(key, el)
}

const setState = (key: FieldKey, status: FieldStatus, msg: string) => {
  fieldState[key].status = status
  fieldState[key].msg = msg
}

// blur 校验：空值不报错（留给提交时统一提示）
const validateField = (key: FieldKey): boolean => {
  const v = values[key].value.trim()
  if (!v) {
    setState(key, '', '')
    return false
  }
  const r = tests[key](v)
  if (r === true) {
    setState(key, 'ok', okTexts[key] ?? '')
    return true
  }
  setState(key, 'err', r)
  return false
}

// 已出结果（对/错）的字段输入时实时复验
const onFieldInput = (key: FieldKey) => {
  if (fieldState[key].status !== '') validateField(key)
}

// 密码强度反馈（纯视觉提示，不改变校验规则）
const LEVELS = ['', '弱 — 再加长一点', '一般 — 试试混入数字', '不错 — 再加符号更强', '很强']
const pwdStrength = (v: string) => {
  let score = 0
  if (v.length >= 6) score++
  if (v.length >= 10) score++
  if (/\d/.test(v) && /[a-zA-Z]/.test(v)) score++
  if (/[^a-zA-Z0-9]/.test(v)) score++
  return Math.max(1, score)
}

// 密码输入：强度条 + hint（无错误时显示强度文案，出错时让位给错误）
const onPasswordInput = () => {
  if (fieldState.password.status !== '') validateField('password')
  const v = password.value
  if (!v) {
    meterLevel.value = 0
    if (fieldState.password.status !== 'err') setState('password', '', '')
    return
  }
  meterLevel.value = pwdStrength(v)
  if (fieldState.password.status !== 'err') setState('password', '', LEVELS[meterLevel.value])
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
  for (const key of ['email', 'username', 'password', 'confirm'] as FieldKey[]) {
    const v = values[key].value.trim()
    const r = v ? tests[key](v) : emptyTexts[key]
    if (r === true) {
      setState(key, 'ok', okTexts[key] ?? '')
    } else {
      setState(key, 'err', r)
      if (!firstBad) firstBad = key
    }
  }
  if (firstBad) {
    shakeAndFocus(firstBad)
    return
  }

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
  <AuthShell lede="注册一个账户，把每日情报、市场复盘和趁手工具收进同一个工作空间。">
    <div class="auth-logo anim-rise d1">
      <h1>创建账户</h1>
      <p>开始你的探索之旅</p>
    </div>

    <form
      class="auth-form anim-rise d2"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <div class="field">
        <label
          class="od-label"
          for="email"
        >邮箱</label>
        <input
          id="email"
          :ref="setFieldInput('email')"
          v-model="email"
          type="email"
          class="od-input"
          :class="fieldState.email.status"
          placeholder="your@email.com"
          autocomplete="email"
          @blur="validateField('email')"
          @input="onFieldInput('email')"
        >
        <p
          class="field-msg"
          :class="fieldState.email.status"
        >
          <AppIcon
            v-if="fieldState.email.status === 'err'"
            name="alert-circle"
            :size="13"
          />
          <AppIcon
            v-else-if="fieldState.email.status === 'ok'"
            name="check"
            :size="13"
          />
          <span>{{ fieldState.email.msg }}</span>
        </p>
      </div>

      <div class="field">
        <label
          class="od-label"
          for="username"
        >用户名</label>
        <input
          id="username"
          :ref="setFieldInput('username')"
          v-model="username"
          type="text"
          class="od-input"
          :class="fieldState.username.status"
          placeholder="3-20个字符，字母数字下划线"
          autocomplete="username"
          @blur="validateField('username')"
          @input="onFieldInput('username')"
        >
        <p
          class="field-msg"
          :class="fieldState.username.status"
        >
          <AppIcon
            v-if="fieldState.username.status === 'err'"
            name="alert-circle"
            :size="13"
          />
          <AppIcon
            v-else-if="fieldState.username.status === 'ok'"
            name="check"
            :size="13"
          />
          <span>{{ fieldState.username.msg }}</span>
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
            placeholder="至少6个字符"
            autocomplete="new-password"
            @blur="validateField('password')"
            @input="onPasswordInput"
          >
          <button
            type="button"
            class="pwd-toggle"
            tabindex="-1"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            @click="togglePassword"
          >
            <AppIcon
              :name="showPassword ? 'eye-off' : 'eye'"
              :size="17"
            />
          </button>
        </div>
        <div
          class="pwd-meter"
          :data-level="meterLevel"
          aria-hidden="true"
        >
          <i /><i /><i /><i />
        </div>
        <p
          class="field-msg"
          :class="fieldState.password.status"
        >
          <AppIcon
            v-if="fieldState.password.status === 'err'"
            name="alert-circle"
            :size="13"
          />
          <span>{{ fieldState.password.msg }}</span>
        </p>
      </div>

      <div class="field">
        <label
          class="od-label"
          for="confirm"
        >确认密码</label>
        <input
          id="confirm"
          :ref="setFieldInput('confirm')"
          v-model="confirmPassword"
          type="password"
          class="od-input"
          :class="fieldState.confirm.status"
          placeholder="再次输入密码"
          autocomplete="new-password"
          @blur="validateField('confirm')"
          @input="onFieldInput('confirm')"
        >
        <p
          class="field-msg"
          :class="fieldState.confirm.status"
        >
          <AppIcon
            v-if="fieldState.confirm.status === 'err'"
            name="alert-circle"
            :size="13"
          />
          <AppIcon
            v-else-if="fieldState.confirm.status === 'ok'"
            name="check"
            :size="13"
          />
          <span>{{ fieldState.confirm.msg }}</span>
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
        {{ isLoading ? '注册中...' : '创建账户' }}
      </button>
    </form>

    <div class="auth-divider anim-rise d3">
      <span>或</span>
    </div>
    <p class="auth-switch anim-rise d4">
      已有账户？ <router-link to="/login">
        立即登录
      </router-link>
    </p>
    <p class="auth-foot anim-rise d5">
      注册即表示同意我们的服务条款和隐私政策
    </p>
  </AuthShell>
</template>
