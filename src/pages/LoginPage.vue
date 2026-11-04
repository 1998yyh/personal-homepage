<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { safeReturnTo } from '../lib/browser-session'
import { useAuthStore } from '../stores/auth'
import UnifiedLoginShell from '../components/auth/UnifiedLoginShell.vue'
import UnifiedLoginForm from '../components/auth/UnifiedLoginForm.vue'

const route = useRoute(), auth = useAuthStore()
const destination = computed(() => safeReturnTo(route.query.returnTo ?? route.query.redirect))
const label = computed(() => destination.value.startsWith('/xunshi') ? '循势 · 我的观察池' : destination.value.startsWith('/xiaofeiyu') ? '小肥鱼 · 日记' : destination.value.startsWith('/admin') ? '团子 · 管理后台' : destination.value.startsWith('/dsh') ? 'dsh · 智能助手' : '我的工作台')
const notice = computed(() => auth.error || (route.query.reason === 'expired' ? '登录状态已失效，请重新登录。' : route.query.reason === 'unavailable' ? '暂时无法验证登录状态，请稍后重试。' : ''))
function continueToProject() { window.location.assign(destination.value) }
onMounted(() => { if (auth.isAuthenticated) continueToProject() })
</script>
<template>
  <UnifiedLoginShell :destination="label">
    <UnifiedLoginForm
      :notice="notice"
      @authenticated="continueToProject"
    />
  </UnifiedLoginShell>
</template>
