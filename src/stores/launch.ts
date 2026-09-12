import { defineStore } from 'pinia'
import { ref } from 'vue'

// 首页到 Agent 选择页再到对话页的临时草稿；不放 URL，避免内容进入浏览历史。
export const useLaunchStore = defineStore('launch', () => {
  const chatPrompt = ref('')
  function takeChatPrompt() {
    const text = chatPrompt.value
    chatPrompt.value = ''
    return text
  }
  return { chatPrompt, takeChatPrompt }
})
