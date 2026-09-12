<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '../AppIcon.vue'
import AppSidebar from './AppSidebar.vue'
import AppearanceSettings from './AppearanceSettings.vue'
import { primaryNavigation, resourceNavigation, extraNavigation } from './navigation'

const route = useRoute()
const mobileMenu = ref<HTMLDialogElement | null>(null)
const settingsOpen = ref(false)
// 只折叠桌面侧栏；手机端始终使用完整的抽屉导航。
const sidebarCollapsed = ref(false)
try {
  sidebarCollapsed.value = localStorage.getItem('tuanzi-sidebar-collapsed') === 'true'
} catch { /* 存储不可用时默认展开 */ }
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try {
    localStorage.setItem('tuanzi-sidebar-collapsed', String(sidebarCollapsed.value))
  } catch { /* 不影响当前页面的展开与收起 */ }
}
const title = computed(() => {
  if (route.path === '/') return '工作空间'
  if (route.path.startsWith('/mcp-servers')) return 'MCP 工具库'
  if (route.path.startsWith('/skills')) return '技能库'
  return [...primaryNavigation, ...resourceNavigation, ...extraNavigation].find(item => item.to !== '/' && route.path.startsWith(item.to.split('?')[0]!.replace('/image', '')))?.label || '工作空间'
})
watch(title, value => { document.title = `团子 AI · ${value}` }, { immediate: true })
watch(() => route.fullPath, () => mobileMenu.value?.close())
function settings() {
  mobileMenu.value?.close()
  settingsOpen.value = true
}
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'sidebar-collapsed': sidebarCollapsed }"
  >
    <aside
      id="desktop-navigation"
      class="desktop-sidebar"
    >
      <AppSidebar
        :collapsed="sidebarCollapsed"
        @settings="settings"
      />
      <button
        class="sidebar-edge-toggle"
        :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
        :title="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
        :aria-expanded="!sidebarCollapsed"
        aria-controls="desktop-navigation"
        @click="toggleSidebar"
      >
        <AppIcon
          name="chevron-right"
          :size="16"
          :class="{ 'sidebar-collapse-arrow': !sidebarCollapsed }"
        />
      </button>
    </aside>
    <div class="app-workspace">
      <header class="workspace-header">
        <div class="workspace-heading">
          <button
            class="od-icon-btn mobile-menu-button"
            aria-label="打开功能导航"
            @click="mobileMenu?.showModal()"
          >
            <AppIcon
              name="grid"
              :size="20"
            />
          </button><span>{{ title }}</span><span class="workspace-divider">/</span><span class="workspace-caption">{{ route.path === '/' ? '创作空间' : '团子 AI' }}</span>
        </div>
        <router-link
          to="/canvas"
          class="od-btn od-btn-soft workspace-action"
        >
          <AppIcon
            name="plus"
            :size="15"
          />新建画布
        </router-link>
      </header>
      <div class="workspace-content">
        <slot />
      </div>
    </div>
    <dialog
      ref="mobileMenu"
      class="mobile-sidebar-dialog"
      aria-label="功能导航"
      @click="event => { if (event.target === mobileMenu) mobileMenu?.close() }"
    >
      <button
        class="mobile-nav-close od-icon-btn"
        aria-label="关闭导航"
        autofocus
        @click="mobileMenu?.close()"
      >
        <AppIcon
          name="x"
          :size="18"
        />
      </button><AppSidebar
        @navigate="mobileMenu?.close()"
        @settings="settings"
      />
    </dialog>
    <AppearanceSettings
      :open="settingsOpen"
      @close="settingsOpen = false"
    />
  </div>
</template>
