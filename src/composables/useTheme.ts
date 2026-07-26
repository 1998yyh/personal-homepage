import { ref } from 'vue'

// 亮/暗主题：初始值由 index.html 内联脚本写入 <html data-theme>，localStorage 键 zhe-theme
export function useTheme() {
  const theme = ref(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme.value
    try {
      localStorage.setItem('zhe-theme', theme.value)
    } catch {
      // 隐私模式下静默失败，仅本次会话生效
    }
  }

  return { theme, toggleTheme }
}
