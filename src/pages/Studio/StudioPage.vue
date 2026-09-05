<script setup lang="ts">
// 生成台板块壳：顶部四子页 Tab（路由驱动，/studio/:tab）+ 按 tab 渲染子页。
// 全站首条需登录路由（meta.requiresAuth，守卫硬拦，见 docs/adr/0002）。
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import StudioGeneratePane from './components/StudioGeneratePane.vue'
import StudioHistoryPage from './StudioHistoryPage.vue'
import type { ModelCapability } from '../../types/ai-generation'

type TabKey = 'image' | 'video' | 'audio' | 'history'

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'image', label: '图片台', icon: 'image' },
  { key: 'video', label: '视频台', icon: 'video' },
  { key: 'audio', label: '音频台', icon: 'music' },
  { key: 'history', label: '任务历史', icon: 'clock' },
]

const route = useRoute()
// 非法 tab 兜底到图片台
const activeTab = computed<TabKey>(() => {
  const t = route.params.tab
  return TABS.some((x) => x.key === t) ? (t as TabKey) : 'image'
})
</script>

<template>
  <div class="min-h-screen">
    <Navbar />
    <div class="mx-auto max-w-7xl px-6 py-8">
      <p class="eyebrow">
        生成台
      </p>
      <h1 class="mt-1 text-2xl font-bold text-fg">
        AI 生成工作台
      </h1>

      <!-- 子页 Tab（路由驱动） -->
      <div class="mt-6 flex gap-1 border-b border-border">
        <router-link
          v-for="t in TABS"
          :key="t.key"
          :to="`/studio/${t.key}`"
          class="-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition"
          :class="
            activeTab === t.key
              ? 'border-accent font-semibold text-fg'
              : 'border-transparent text-muted hover:text-fg'
          "
        >
          <AppIcon
            :name="t.icon"
            :size="16"
          />{{ t.label }}
        </router-link>
      </div>

      <!-- 能力子页：左表单 + 右结果流 -->
      <div
        v-if="activeTab !== 'history'"
        class="mt-6"
      >
        <StudioGeneratePane
          :key="activeTab"
          :capability="(activeTab as ModelCapability)"
        />
      </div>

      <!-- 任务历史 -->
      <div
        v-else
        class="mt-6"
      >
        <StudioHistoryPage />
      </div>
    </div>
  </div>
</template>
