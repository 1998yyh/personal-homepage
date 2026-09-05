<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTheme } from '../composables/useTheme'
import AppIcon from './AppIcon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const navItems = [
  { path: '/ai-news', label: 'AI资讯', activePattern: /\/ai-news/ },
  { path: '/stock-news', label: '股票资讯', activePattern: /\/stock-news/ },
  { path: '/dev-tools', label: '开发工具', activePattern: /\/dev-tools/ },
  { path: '/canvas', label: '画布', activePattern: /\/canvas/ },
  { path: '/prompts', label: '提示词', activePattern: /\/prompts/ },
  { path: '/channels', label: '渠道', activePattern: /\/channels/ },
  { path: '/assets', label: '素材', activePattern: /\/assets/ },
  { path: '/agents', label: 'Agent', activePattern: /\/agents/ },
  { path: '/studio', label: '生成台', activePattern: /\/studio/ },
]

const isActive = (pattern: RegExp) => pattern.test(route.path)

// 亮/暗主题切换（与认证页共用同一逻辑）
const { theme, toggleTheme } = useTheme()

// 守卫只在导航时触发，光 logout 不会离开当前页，必须显式跳转
const handleLogout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
    <div class="max-w-[1080px] mx-auto px-6 h-16 flex items-center gap-6">
      <!-- Logo -->
      <router-link
        to="/"
        class="flex items-center gap-2.5 shrink-0"
      >
        <span class="w-[34px] h-[34px] rounded-[11px] grid place-items-center bg-gradient-to-br from-accent to-[oklch(46%_0.13_285)] text-white font-extrabold text-base shadow-card">哲</span>
        <span class="font-display font-bold text-[17px] tracking-[-0.01em] text-fg">Web Tools</span>
      </router-link>

      <!-- 导航链接 -->
      <div class="flex items-center gap-1 ml-auto overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="od-nav-link whitespace-nowrap"
          :class="{ active: isActive(item.activePattern) }"
        >
          {{ item.label }}
        </router-link>
      </div>

      <!-- 主题切换 -->
      <button
        class="od-icon-btn shrink-0"
        :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
        @click="toggleTheme"
      >
        <AppIcon
          :name="theme === 'dark' ? 'sun' : 'moon'"
          :size="18"
        />
      </button>

      <!-- 用户信息 -->
      <div
        v-if="auth.isAuthenticated"
        class="flex items-center gap-3 shrink-0"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-accent-soft text-accent-strong flex items-center justify-center">
            <span class="text-sm font-semibold">
              {{ auth.user?.username?.charAt(0).toUpperCase() || 'U' }}
            </span>
          </div>
          <span class="text-fg/80 text-sm hidden sm:block">{{ auth.user?.username }}</span>
        </div>
        <button
          class="text-muted hover:text-fg text-sm transition-colors cursor-pointer"
          @click="handleLogout"
        >
          退出
        </button>
      </div>

      <!-- 未登录：登录入口 -->
      <router-link
        v-else
        to="/login"
        class="od-nav-link shrink-0"
      >
        登录
      </router-link>
    </div>
  </nav>
</template>
