<script setup lang="ts">
import Navbar from '../components/Navbar.vue'
import AppIcon from '../components/AppIcon.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const gates = [
  { icon: 'bot', title: 'AI情报早报', desc: 'AI / Agent / Claude Code 每日精选', to: '/ai-news', gradient: 'from-accent to-[oklch(46%_0.13_285)]' },
  { icon: 'trending-up', title: '股票资讯日报', desc: 'A股 / 港股 每日市场精选', to: '/stock-news', gradient: 'from-domain to-[oklch(45%_0.11_235)]' },
  { icon: 'wrench', title: '开发工具箱', desc: '编码解码 / 格式化 / 转换工具', to: '/dev-tools', gradient: 'from-warn to-[oklch(60%_0.15_50)]' },
]

// id 与 DevTools 工具一一对应，复用同一套 SVG 图标
const quickTools = [
  { id: 'base64', icon: 'binary', name: 'Base64' },
  { id: 'url', icon: 'link', name: 'URL' },
  { id: 'json', icon: 'braces', name: 'JSON' },
  { id: 'timestamp', icon: 'clock', name: '时间戳' },
  { id: 'color', icon: 'palette', name: '颜色' },
  { id: 'uuid', icon: 'key', name: 'UUID' },
  { id: 'password', icon: 'lock', name: '密码' },
  { id: 'hash', icon: 'shield-check', name: 'Hash' },
]

const tickerWords = ['终身学习', 'AI 应用', '价值投资', '复盘纪律', '自动化', '长期主义', '写作输出']
</script>

<template>
  <div class="min-h-screen">
    <!-- 导航栏 -->
    <Navbar />

    <!-- Hero -->
    <header class="max-w-[1080px] mx-auto px-6 pt-24 pb-16">
      <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border text-[13px] font-medium tracking-wide text-fg">
        <span class="w-[7px] h-[7px] rounded-full bg-success animate-pulse" />
        工作空间已就绪
      </span>
      <h1 class="font-display text-[clamp(2.4rem,5.6vw,4.2rem)] font-extrabold leading-[1.12] tracking-[-0.025em] mt-6 mb-5 max-w-[15em]">
        欢迎回来，<span class="relative whitespace-nowrap">{{ auth.user?.username || '朋友' }}<svg
          class="absolute left-0 right-0 -bottom-[0.18em] w-full h-[0.28em] text-accent opacity-75"
          viewBox="0 0 120 12"
          preserveAspectRatio="none"
        ><path
          d="M2 8 Q 16 2, 32 7 T 62 7 T 92 6 T 118 7"
          fill="none"
          stroke="currentColor"
          stroke-width="3.5"
          stroke-linecap="round"
        /></svg></span>
      </h1>
      <p class="text-lg text-muted max-w-[56ch]">
        这里记录每日的 AI 情报与市场复盘，也收纳了趁手的开发小工具 —— 把重复的事交给工具，把思考留给自己。
      </p>
      <div class="flex gap-3 mt-8 flex-wrap">
        <router-link
          to="/ai-news"
          class="od-btn od-btn-primary !px-[22px] !py-[13px] !text-[15px]"
        >
          看看今日日报
          <AppIcon
            name="arrow-right"
            :size="15"
          />
        </router-link>
        <router-link
          to="/dev-tools"
          class="od-btn od-btn-ghost !px-[22px] !py-[13px] !text-[15px]"
        >
          打开开发工具箱
        </router-link>
      </div>

      <!-- 跑马灯 -->
      <div
        class="ticker mt-14"
        aria-hidden="true"
      >
        <div class="ticker-track">
          <span
            v-for="(word, i) in [...tickerWords, ...tickerWords]"
            :key="i"
          >{{ word }}</span>
        </div>
      </div>
    </header>

    <!-- 板块入口 -->
    <div class="max-w-[1080px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pb-16">
      <router-link
        v-for="gate in gates"
        :key="gate.to"
        :to="gate.to"
        class="od-card group flex flex-col gap-3 p-[22px] transition-all duration-200 hover:-translate-y-1 hover:shadow-lift"
      >
        <span
          class="w-11 h-11 rounded-[13px] grid place-items-center text-white bg-gradient-to-br"
          :class="gate.gradient"
        >
          <AppIcon
            :name="gate.icon"
            :size="22"
          />
        </span>
        <span class="font-display text-[17px] font-bold tracking-[-0.01em] text-fg flex items-center gap-2">
          {{ gate.title }}
          <AppIcon
            name="arrow-right"
            :size="15"
            class="text-muted transition-all duration-200 group-hover:translate-x-1 group-hover:text-accent-strong"
          />
        </span>
        <span class="text-[13.5px] text-muted">{{ gate.desc }}</span>
      </router-link>
    </div>

    <!-- 常用工具 -->
    <div class="max-w-[1080px] mx-auto px-6 pb-20">
      <div class="od-card p-6">
        <h3 class="text-muted text-sm font-medium mb-4">
          常用工具
        </h3>
        <div class="flex flex-wrap gap-2">
          <router-link
            v-for="tool in quickTools"
            :key="tool.id"
            to="/dev-tools"
            class="od-chip"
          >
            <AppIcon
              :name="tool.icon"
              :size="14"
              class="text-muted"
            />
            {{ tool.name }}
          </router-link>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="max-w-[1080px] mx-auto px-6 py-10 border-t border-border flex justify-between gap-4 flex-wrap text-[13px] text-muted">
      <span>© 2026 Web Tools · 用心打磨，Claude Code 协助搭建</span>
    </footer>
  </div>
</template>
