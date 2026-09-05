import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../pages/LoginPage.vue') },
    { path: '/register', component: () => import('../pages/RegisterPage.vue') },
    { path: '/', component: () => import('../pages/HomePage.vue') },
    { path: '/ai-news', component: () => import('../pages/DailyReports/AIReportsPage.vue') },
    { path: '/stock-news', component: () => import('../pages/DailyReports/StockReportsPage.vue') },
    { path: '/stock-signals', component: () => import('../pages/StockSignals/StockSignalsPage.vue') },
    { path: '/dev-tools', component: () => import('../pages/DevTools/DevToolsPage.vue') },
    { path: '/agents', component: () => import('../pages/Agents/AgentsPage.vue') },
    { path: '/agents/:id', component: () => import('../pages/Agents/AgentChatPage.vue') },
    { path: '/mcp-servers', component: () => import('../pages/McpServers/McpServersPage.vue') },
    { path: '/skills', component: () => import('../pages/Skills/SkillsPage.vue') },
    { path: '/canvas', component: () => import('../pages/Canvas/CanvasListPage.vue') },
    { path: '/canvas/:id', component: () => import('../pages/Canvas/CanvasEditorPage.vue') },
    { path: '/channels', component: () => import('../pages/Channels/ChannelsPage.vue') },
    { path: '/prompts', component: () => import('../pages/Prompts/PromptsPage.vue') },
    { path: '/assets', component: () => import('../pages/Assets/AssetsPage.vue') },
    // 生成台：全站首条需登录路由（meta.requiresAuth，守卫硬拦，见 docs/adr/0002）
    { path: '/studio', redirect: '/studio/image' },
    {
      path: '/studio/:tab',
      component: () => import('../pages/Studio/StudioPage.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/daily-reports', redirect: '/ai-news' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 全局前置守卫：首次导航尝试拉取用户资料（有 token 才发请求）。
// 绝大多数页面公开访问；仅 meta.requiresAuth 的路由（如 /studio/*）需登录，
// 未登录重定向登录页并带 redirect 回跳（见 docs/adr/0002）。
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.isLoading) {
    await auth.fetchProfile()
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
