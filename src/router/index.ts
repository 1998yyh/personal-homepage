import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../pages/LoginPage.vue'), meta: { public: true } },
    { path: '/register', component: () => import('../pages/RegisterPage.vue'), meta: { public: true } },
    { path: '/', component: () => import('../pages/HomePage.vue') },
    { path: '/ai-news', component: () => import('../pages/DailyReports/AIReportsPage.vue') },
    { path: '/stock-news', component: () => import('../pages/DailyReports/StockReportsPage.vue') },
    { path: '/dev-tools', component: () => import('../pages/DevTools/DevToolsPage.vue') },
    { path: '/agents', component: () => import('../pages/Agents/AgentsPage.vue') },
    { path: '/agents/:id', component: () => import('../pages/Agents/AgentChatPage.vue') },
    { path: '/mcp-servers', component: () => import('../pages/McpServers/McpServersPage.vue') },
    { path: '/skills', component: () => import('../pages/Skills/SkillsPage.vue') },
    { path: '/daily-reports', redirect: '/ai-news' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 全局前置守卫：首次导航尝试拉取用户资料（有 token 才发请求），
// 不再强制登录——所有页面公开访问，登录仅用于展示用户信息
router.beforeEach(async () => {
  const auth = useAuthStore()
  if (auth.isLoading) {
    await auth.fetchProfile()
  }
  return true
})

export default router
