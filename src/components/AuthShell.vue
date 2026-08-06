<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { useTheme } from '../composables/useTheme'

// 认证页共用外壳（对齐 design/login.html、register.html 的 auth-stage）：
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
          <span class="brand-badge">哲</span>
          <div>
            <h2>
              把重复的事交给<span class="u">工具<svg
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
              ><path
                d="M2 8 Q 16 2, 32 7 T 62 7 T 92 6 T 118 7"
                fill="none"
                stroke="currentColor"
                stroke-width="3.5"
                stroke-linecap="round"
              /></svg></span>，<br>把思考留给自己。
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
              name="trending-up"
              :size="17"
            />
            <div><b>A股 / 港股市场复盘</b><span>收盘后十分钟，知道今天该知道的事</span></div>
          </li>
          <li>
            <AppIcon
              name="shield"
              :size="17"
            />
            <div><b>数据自有，匿名可访问</b><span>全站免登录可用，账户只用于个性化</span></div>
          </li>
        </ul>

        <div class="auth-brand-foot anim-rise d3">
          终身学习 · 长期主义
        </div>
      </aside>

      <!-- 右栏 · 表单（由页面提供） -->
      <div class="auth-panel">
        <slot />
      </div>
    </div>
  </div>
</template>
