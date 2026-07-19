<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const navItems = [
  { path: '/ai-news', label: 'AI资讯', emoji: '🤖', activePattern: /\/ai-news/ },
  { path: '/stock-news', label: '股票资讯', emoji: '📈', activePattern: /\/stock-news/ },
  { path: '/dev-tools', label: '开发工具', emoji: '⚙️', activePattern: /\/dev-tools/ },
]

const isActive = (pattern: RegExp) => pattern.test(route.path)

// 守卫只在导航时触发，光 logout 不会离开当前页，必须显式跳转
const handleLogout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="relative z-10 glass-dark border-b border-white/5">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-8">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-3 group">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="text-xl font-display font-bold text-white">Web Tools</span>
        </router-link>

        <!-- 导航标签 -->
        <div class="flex items-center gap-1 bg-white/5 rounded-full p-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300',
              isActive(item.activePattern)
                ? 'bg-gradient-to-r from-primary-500/30 to-primary-600/30 text-white'
                : 'hover:bg-white/10 text-white/70 hover:text-white',
            ]"
          >
            <span class="text-sm">{{ item.emoji }}</span>
            <span class="text-sm font-medium">{{ item.label }}</span>
          </router-link>
        </div>
      </div>

      <!-- 用户信息 -->
      <div v-if="auth.isAuthenticated" class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span class="text-white text-sm font-medium">
              {{ auth.user?.username?.charAt(0).toUpperCase() || 'U' }}
            </span>
          </div>
          <span class="text-white/80 text-sm hidden sm:block">{{ auth.user?.username }}</span>
        </div>
        <button
          class="text-white/60 hover:text-white text-sm transition-colors"
          @click="handleLogout"
        >
          退出
        </button>
      </div>
    </div>
  </nav>
</template>
