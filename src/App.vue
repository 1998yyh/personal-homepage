<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppToast from './components/AppToast.vue'
import AppShell from './components/layout/AppShell.vue'

const route = useRoute()
// 认证页和沉浸式画布自行提供外壳，其余页面共用侧栏，路由切换不重建全站设置。
const standalone = computed(() => ['/login', '/register'].includes(route.path) || /^\/canvas\/[^/]+$/.test(route.path))
watch(() => route.path, path => {
  if (path === '/login' || path === '/register') document.title = `团子 AI · ${path === '/login' ? '登录' : '注册'}`
}, { immediate: true })
</script>

<template>
  <router-view v-if="standalone" />
  <AppShell v-else>
    <router-view />
  </AppShell>
  <AppToast />
</template>
