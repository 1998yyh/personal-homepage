<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { useTheme } from '../composables/useTheme'

// 认证页共用品牌外壳：
// 返回首页 + 主题切换 + 左栏品牌叙事；右栏表单由 slot 提供
defineProps<{
  lede: string
}>()

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <div class="auth-stage">
    <router-link
      class="od-nav-link auth-back"
      to="/"
    >
      <AppIcon
        name="arrow-left"
        :size="15"
      />
      <span class="txt">返回首页</span>
    </router-link>
    <button
      class="od-icon-btn auth-theme-btn"
      :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
      @click="toggleTheme"
    >
      <AppIcon
        :name="theme === 'dark' ? 'sun' : 'moon'"
        :size="18"
      />
    </button>

    <div class="od-card auth-shell">
      <!-- 左栏 · 品牌叙事 -->
      <aside class="auth-brand">
        <div class="auth-brand-top anim-rise">
          <div class="auth-brand-name">
            <span class="brand-badge"><AppIcon
              name="sparkles"
              :size="22"
            /></span>团子 AI
          </div>
          <div>
            <h2>
              把想象交给<span class="u">AI<svg
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
              ><path
                d="M2 8 Q 16 2, 32 7 T 62 7 T 92 6 T 118 7"
                fill="none"
                stroke="currentColor"
                stroke-width="3.5"
                stroke-linecap="round"
              /></svg></span>，<br>让创作更进一步。
            </h2>
            <p
              class="lede"
              style="margin-top:14px"
            >
              {{ lede }}
            </p>
          </div>
        </div>

        <ul class="auth-points anim-rise d2">
          <li>
            <AppIcon
              name="bot"
              :size="17"
            />
            <div><b>每日 AI 情报早报</b><span>AI / Agent / Claude Code 精选，通勤路上读完</span></div>
          </li>
          <li>
            <AppIcon
              name="image"
              :size="17"
            />
            <div><b>图像、视频与无限画布</b><span>从一个想法开始，把灵感变成作品</span></div>
          </li>
          <li>
            <AppIcon
              name="shield"
              :size="17"
            />
            <div><b>自己的 Agent 工作空间</b><span>创建 AI 助手，连接工具与知识</span></div>
          </li>
        </ul>

        <div class="auth-brand-foot anim-rise d3">
          对话 · 创作 · 发现
        </div>
      </aside>

      <!-- 右栏 · 表单（由页面提供） -->
      <div class="auth-panel">
        <slot />
      </div>
    </div>
  </div>
</template>
