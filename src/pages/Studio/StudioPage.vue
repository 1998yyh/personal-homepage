<script setup lang="ts">
// 生成台板块壳：顶栏三能力 Tab + 满高工作区（左历史栏由 pane 承担）。
// 不再给 pane 加 :key=tab——会话在 Pinia，整树重挂会丢掉进行中的占位。
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
import StudioGeneratePane from './components/StudioGeneratePane.vue'
import type { ModelCapability } from '../../types/ai-generation'

type TabKey = 'image' | 'video' | 'audio'

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'image', label: '图片台', icon: 'image' },
  { key: 'video', label: '视频台', icon: 'video' },
  { key: 'audio', label: '音频台', icon: 'music' },
]

const route = useRoute()
const activeTab = computed<TabKey>(() => {
  const t = route.params.tab
  return TABS.some((x) => x.key === t) ? (t as TabKey) : 'image'
})
</script>

<template>
  <div class="min-h-screen">
    <Navbar />
    <div class="flex h-[calc(100vh-4rem)] flex-col">
      <div class="flex shrink-0 gap-1 border-b border-border px-4">
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

      <StudioGeneratePane
        class="min-h-0 flex-1"
        :capability="(activeTab as ModelCapability)"
      />
    </div>
  </div>
</template>
