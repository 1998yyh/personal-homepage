import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import './index.css'
import App from './App.vue'
import router from './router'
import { browserSession } from './lib/browser-session'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
})

// 换号、撤销或跨项目退出时重新挂载应用，清空 Pinia 中的画布/生成状态与查询缓存。
let identity = ''
browserSession.subscribe(state => {
  const next = state.user ? `${state.user.id}:${state.user.role}:${state.apps.join()}` : ''
  if (identity && identity !== next) {
    void queryClient.cancelQueries()
    queryClient.clear()
    window.location.reload()
  }
  identity = next
})

createApp(App)
  .use(createPinia())
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount('#app')
