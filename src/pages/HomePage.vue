<script setup lang="ts">
import Navbar from '../components/Navbar.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const quickTools = [
  { icon: '🔤', name: 'Base64', to: '/dev-tools' },
  { icon: '🔗', name: 'URL', to: '/dev-tools' },
  { icon: '📋', name: 'JSON', to: '/dev-tools' },
  { icon: '⏰', name: '时间戳', to: '/dev-tools' },
  { icon: '🎨', name: '颜色', to: '/dev-tools' },
  { icon: '🔑', name: 'UUID', to: '/dev-tools' },
  { icon: '🔐', name: '密码', to: '/dev-tools' },
  { icon: '✔️', name: 'Hash', to: '/dev-tools' },
]
</script>

<template>
  <div class="min-h-screen bg-mesh relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="orb orb-1" />
    <div class="orb orb-2" />
    <div class="orb orb-3" />

    <!-- 导航栏 -->
    <Navbar />

    <!-- 主内容 -->
    <main class="relative z-10 max-w-6xl mx-auto px-4 py-12">
      <!-- 欢迎卡片 -->
      <div class="glass-dark rounded-3xl p-8 mb-8">
        <h1 class="text-4xl font-display font-bold text-white mb-4">
          欢迎回来，<span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-cyan-400">{{ auth.user?.username }}</span> 👋
        </h1>
        <p class="text-dark-300 text-lg">
          你的个人工作空间已准备就绪，开始探索吧！
        </p>
      </div>

      <!-- 功能卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- AI资讯卡片 -->
        <router-link
          to="/ai-news"
          class="group glass-dark rounded-2xl p-6 border border-transparent hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden"
        >
          <!-- 悬浮光效 -->
          <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500" />

          <div class="relative">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span class="text-3xl">🤖</span>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              AI情报早报
              <svg
                class="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </h3>
            <p class="text-dark-400 text-sm">
              AI / Agent / Claude Code 每日精选
            </p>
          </div>
        </router-link>

        <!-- 股票资讯卡片 -->
        <router-link
          to="/stock-news"
          class="group glass-dark rounded-2xl p-6 border border-transparent hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden"
        >
          <!-- 悬浮光效 -->
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-500" />

          <div class="relative">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span class="text-3xl">📈</span>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              股票资讯日报
              <svg
                class="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </h3>
            <p class="text-dark-400 text-sm">
              A股 / 港股 每日市场精选
            </p>
          </div>
        </router-link>

        <!-- 开发工具卡片 -->
        <router-link
          to="/dev-tools"
          class="group glass-dark rounded-2xl p-6 border border-transparent hover:border-cyan-500/30 transition-all duration-300 relative overflow-hidden"
        >
          <!-- 悬浮光效 -->
          <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-500" />

          <div class="relative">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span class="text-3xl">⚙️</span>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              开发工具箱
              <svg
                class="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </h3>
            <p class="text-dark-400 text-sm">
              编码解码 / 格式化 / 转换工具
            </p>
          </div>
        </router-link>
      </div>

      <!-- 快捷工具 -->
      <div class="glass-dark rounded-2xl p-6">
        <h3 class="text-white/60 text-sm mb-4">
          常用工具
        </h3>
        <div class="grid grid-cols-4 md:grid-cols-8 gap-3">
          <router-link
            v-for="tool in quickTools"
            :key="tool.name"
            :to="tool.to"
            class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <span class="text-2xl group-hover:scale-110 transition-transform">{{ tool.icon }}</span>
            <span class="text-white/50 text-xs group-hover:text-white/80 transition-colors">{{ tool.name }}</span>
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>
