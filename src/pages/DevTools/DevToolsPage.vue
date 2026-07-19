<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import Navbar from '../../components/Navbar.vue'
import Base64Tool from './tools/Base64Tool.vue'
import UrlTool from './tools/UrlTool.vue'
import HtmlEntityTool from './tools/HtmlEntityTool.vue'
import UnicodeTool from './tools/UnicodeTool.vue'
import JsonTool from './tools/JsonTool.vue'
import TimestampTool from './tools/TimestampTool.vue'
import ColorTool from './tools/ColorTool.vue'
import NumberBaseTool from './tools/NumberBaseTool.vue'
import UuidTool from './tools/UuidTool.vue'
import PasswordTool from './tools/PasswordTool.vue'
import HashTool from './tools/HashTool.vue'

interface Tool {
  id: string
  name: string
  icon: string
  category: string
}

const tools: Tool[] = [
  // 编码/解码
  { id: 'base64', name: 'Base64', icon: '🔤', category: '编码/解码' },
  { id: 'url', name: 'URL 编码', icon: '🔗', category: '编码/解码' },
  { id: 'html-entity', name: 'HTML 实体', icon: '📄', category: '编码/解码' },
  { id: 'unicode', name: 'Unicode', icon: '🌐', category: '编码/解码' },
  // 格式化
  { id: 'json', name: 'JSON 格式化', icon: '📋', category: '格式化' },
  // 转换
  { id: 'timestamp', name: '时间戳转换', icon: '⏰', category: '转换' },
  { id: 'color', name: '颜色转换', icon: '🎨', category: '转换' },
  { id: 'number-base', name: '进制转换', icon: '🔢', category: '转换' },
  // 生成
  { id: 'uuid', name: 'UUID 生成', icon: '🔑', category: '生成' },
  { id: 'password', name: '随机密码', icon: '🔐', category: '生成' },
  { id: 'hash', name: 'Hash 计算', icon: '✔️', category: '生成' },
]

const categories = [...new Set(tools.map(t => t.category))]

const toolComponents: Record<string, Component> = {
  base64: Base64Tool,
  url: UrlTool,
  'html-entity': HtmlEntityTool,
  unicode: UnicodeTool,
  json: JsonTool,
  timestamp: TimestampTool,
  color: ColorTool,
  'number-base': NumberBaseTool,
  uuid: UuidTool,
  password: PasswordTool,
  hash: HashTool,
}

const selectedTool = ref<Tool>(tools[0])
const searchQuery = ref('')

const filteredTools = computed(() =>
  tools.filter(t => t.name.toLowerCase().includes(searchQuery.value.toLowerCase())),
)

const toolsOfCategory = (category: string) => filteredTools.value.filter(t => t.category === category)
</script>

<template>
  <div class="min-h-screen bg-mesh relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="orb orb-1" />
    <div class="orb orb-2" />
    <div class="orb orb-3" />

    <!-- 导航栏 -->
    <Navbar />

    <!-- 主内容 -->
    <main class="relative z-10 max-w-7xl mx-auto px-4 py-4">
      <div class="flex gap-4 h-[calc(100vh-88px)]">
        <!-- 左侧：工具列表 -->
        <div class="w-56 flex-shrink-0 glass-dark rounded-xl overflow-hidden">
          <div class="px-3 py-3 border-b border-white/[0.06]">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索工具..."
              class="w-full px-3 py-2 bg-white/5 rounded-lg text-sm text-white placeholder-white/30 border border-transparent focus:border-white/10 focus:outline-none"
            >
          </div>
          <div class="p-2 h-[calc(100%-60px)] overflow-y-auto">
            <template
              v-for="category in categories"
              :key="category"
            >
              <div
                v-if="toolsOfCategory(category).length > 0"
                class="mb-3"
              >
                <h3 class="text-white/30 text-xs font-medium px-2 mb-1">
                  {{ category }}
                </h3>
                <button
                  v-for="tool in toolsOfCategory(category)"
                  :key="tool.id"
                  class="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                  :class="
                    selectedTool.id === tool.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  "
                  @click="selectedTool = tool"
                >
                  <span>{{ tool.icon }}</span>
                  <span class="text-sm">{{ tool.name }}</span>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- 右侧：工具工作区 -->
        <div class="flex-1 glass-dark rounded-xl overflow-hidden">
          <div class="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <span class="text-xl">{{ selectedTool.icon }}</span>
            <h2 class="text-lg font-medium text-white">
              {{ selectedTool.name }}
            </h2>
          </div>
          <div class="p-6 h-[calc(100%-60px)] overflow-y-auto">
            <component :is="toolComponents[selectedTool.id]" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
