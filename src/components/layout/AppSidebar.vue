<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AppIcon from '../AppIcon.vue'
import { primaryNavigation, resourceNavigation } from './navigation'

defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ settings: []; navigate: [] }>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
function active(to: string) {
  if (to === '/') return route.path === '/'
  if (to.startsWith('/studio')) return route.path.startsWith('/studio')
  if (to === '/agents') return /^\/(agents|mcp-servers|skills)(\/|$)/.test(route.path)
  return route.path === to || route.path.startsWith(`${to}/`)
}
function logout() {
  // 退出后显式导航，确保当前受保护页面不会留在屏幕上。
  auth.logout()
  emit('navigate')
  router.push('/login')
}
</script>

<template>
  <div
    class="app-sidebar"
    :class="{ 'is-collapsed': collapsed }"
  >
    <router-link
      to="/"
      class="app-brand"
      aria-label="团子 AI 首页"
      :title="collapsed ? '团子 AI 首页' : undefined"
      @click="emit('navigate')"
    >
      <span class="app-brand-mark"><AppIcon
        name="sparkles"
        :size="22"
      /></span><span class="sidebar-brand-text">团子 AI</span><span class="brand-beta">BETA</span>
    </router-link>
    <nav
      class="sidebar-nav"
      aria-label="主要功能"
    >
      <router-link
        v-for="item in primaryNavigation"
        :key="item.to"
        :to="item.to"
        :aria-label="item.label"
        :title="collapsed ? item.label : undefined"
        :class="{ active: active(item.to) }"
        :aria-current="active(item.to) ? 'page' : undefined"
        @click="emit('navigate')"
      >
        <AppIcon
          :name="item.icon"
          :size="18"
        /><span class="sidebar-text">{{ item.label }}</span><i v-if="active(item.to)" />
      </router-link>
    </nav>
    <div class="sidebar-label">
      我的资源
    </div>
    <nav
      class="sidebar-nav"
      aria-label="资源管理"
    >
      <router-link
        v-for="item in resourceNavigation"
        :key="item.to"
        :to="item.to"
        :aria-label="item.label"
        :title="collapsed ? item.label : undefined"
        :class="{ active: active(item.to) }"
        :aria-current="active(item.to) ? 'page' : undefined"
        @click="emit('navigate')"
      >
        <AppIcon
          :name="item.icon"
          :size="18"
        /><span class="sidebar-text">{{ item.label }}</span>
      </router-link>
    </nav>
    <div class="sidebar-foot">
      <button
        class="sidebar-setting"
        aria-label="设置"
        :title="collapsed ? '设置' : undefined"
        @click="emit('settings')"
      >
        <AppIcon
          name="settings"
          :size="18"
        /><span class="sidebar-text">设置</span><AppIcon
          name="chevron-right"
          :size="15"
        />
      </button>
      <div class="sidebar-profile">
        <span class="sidebar-avatar">{{ auth.user?.username?.charAt(0).toUpperCase() || 'T' }}</span><span class="sidebar-user"><b>{{ auth.user?.username || '我的空间' }}</b><small>{{ auth.isAuthenticated ? '让 AI 参与每一天' : '登录以保存你的创作' }}</small></span><button
          v-if="auth.isAuthenticated"
          class="sidebar-account"
          @click="logout"
        >
          退出
        </button><router-link
          v-else
          to="/login"
          class="sidebar-account"
          @click="emit('navigate')"
        >
          登录
        </router-link>
      </div>
    </div>
  </div>
</template>
