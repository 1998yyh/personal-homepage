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
    { path: '/daily-reports', redirect: '/ai-news' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// 全局前置守卫：首次导航拉取用户资料，未登录跳 /login 并带 redirect
router.beforeEach(async (to) => {
  if (to.meta.public) return true
  const auth = useAuthStore()
  if (auth.isLoading) {
    await auth.fetchProfile()
  }
  if (!auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
