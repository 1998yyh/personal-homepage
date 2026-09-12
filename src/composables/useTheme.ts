import { readonly, ref } from 'vue'

export type Theme = 'dark' | 'light'
// 全站共享一个响应式主题，设置、登录页与跨标签页修改保持一致。
const theme = ref<Theme>(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
const storageMessage = ref('')

function applyTheme(value: Theme) {
  theme.value = value
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
}

function setTheme(value: Theme) {
  applyTheme(value)
  try {
    localStorage.setItem('zhe-theme', value)
    localStorage.removeItem('tuanzi-ui-appearance')
    storageMessage.value = '外观已保存，下次打开自动使用。'
  } catch {
    storageMessage.value = '已切换外观，当前浏览器无法保存设置。'
  }
}

window.addEventListener('storage', (event) => {
  if (event.key === 'zhe-theme' && (event.newValue === 'dark' || event.newValue === 'light')) {
    applyTheme(event.newValue)
  }
})

export function useTheme() {
  return {
    theme: readonly(theme),
    storageMessage: readonly(storageMessage),
    setTheme,
    toggleTheme: () => setTheme(theme.value === 'dark' ? 'light' : 'dark'),
  }
}
