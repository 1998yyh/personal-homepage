<script setup lang="ts">
import { shallowRef } from 'vue'
import { useAuthStore } from '../../stores/auth'
import AppIcon from '../AppIcon.vue'
defineProps<{ notice?: string }>()
const emit = defineEmits<{ authenticated: [] }>()
const auth = useAuthStore()
const name = shallowRef(''), password = shallowRef(''), remember = shallowRef(false)
const visible = shallowRef(false), busy = shallowRef(false), error = shallowRef('')
async function submit() {
  if (busy.value) return
  if (!name.value.trim() || !password.value) { error.value = '请输入账号和密码'; return }
  busy.value = true; error.value = ''
  try { await auth.login(name.value, password.value, remember.value); emit('authenticated') }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '登录失败，请稍后重试' }
  finally { password.value = ''; busy.value = false }
}
</script>
<template>
  <form
    class="unified-login-form"
    @submit.prevent="submit"
  >
    <p
      v-if="error || notice"
      class="login-error"
      role="alert"
    >
      {{ error || notice }}
    </p>
    <label for="unified-account">邮箱或用户名</label><input
      id="unified-account"
      v-model="name"
      name="username"
      autocomplete="username"
      placeholder="输入你的团子账号"
      maxlength="254"
      required
      :disabled="busy"
    >
    <label for="unified-password">密码</label><div class="login-password">
      <input
        id="unified-password"
        v-model="password"
        name="password"
        :type="visible ? 'text' : 'password'"
        autocomplete="current-password"
        placeholder="输入你的密码"
        maxlength="1024"
        required
        :disabled="busy"
      ><button
        type="button"
        :aria-label="visible ? '隐藏密码' : '显示密码'"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <AppIcon
          :name="visible ? 'eye-off' : 'eye'"
          :size="18"
        />
      </button>
    </div>
    <label class="login-remember"><input
      v-model="remember"
      type="checkbox"
      :disabled="busy"
    >记住此设备 7 天</label>
    <button
      class="login-submit"
      type="submit"
      :disabled="busy"
    >
      {{ busy ? '正在登录…' : '登录并继续' }}<AppIcon
        name="arrow-right"
        :size="18"
      />
    </button>
    <p class="login-account-note">
      使用现有团子账号，访问已授权的项目。
    </p>
  </form>
</template>
<style scoped>
.unified-login-form { margin-top:29px; display:flex; flex-direction:column; }
.unified-login-form>label:not(.login-remember) { font-size:12px; margin-bottom:10px; }
.unified-login-form>label:not(:first-child):not(.login-remember) { margin-top:20px; }
.unified-login-form input:not([type=checkbox]) { width:100%; height:49px; min-width:0; border:1px solid var(--login-border); border-radius:9px; background:var(--login-paper); padding:0 14px; font:inherit; color:var(--login-ink); }
.unified-login-form input:focus-visible { outline:2px solid var(--login-blue); outline-offset:2px; }
.unified-login-form input::placeholder { color:var(--login-muted); }
.login-password { position:relative; }
.login-password input { padding-right:50px!important; }
.login-password button { position:absolute; top:3px; right:5px; background:transparent; color:var(--login-muted); border:0; width:40px; height:43px; display:grid; place-items:center; cursor:pointer; }
.login-remember { display:flex; align-items:center; gap:9px; margin-top:20px; font-size:12px; color:var(--login-muted); min-height:28px; }
.login-remember input { accent-color:var(--login-blue); }
.login-submit { display:flex; align-items:center; justify-content:center; gap:13px; width:100%; min-height:49px; border:0; border-radius:9px; padding:12px 17px; background:var(--login-blue); color:var(--login-on-blue); font:inherit; cursor:pointer; margin-top:20px; }
.login-submit:disabled { opacity:.65; cursor:wait; }
.login-account-note { font-size:11px; color:var(--login-muted); text-align:center; margin-top:22px; }
.login-error { background:var(--login-soft); padding:12px; border-radius:8px; font-size:12px; line-height:1.7; margin-bottom:4px; }
@media(max-width:760px) { .unified-login-form input:not([type=checkbox]) { font-size:16px; } }
</style>
