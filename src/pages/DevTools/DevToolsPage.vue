<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import Navbar from '../../components/Navbar.vue'
import AppIcon from '../../components/AppIcon.vue'
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
  { id: 'base64', name: 'Base64', icon: 'binary', category: '编码/解码' },
  { id: 'url', name: 'URL 编码', icon: 'link', category: '编码/解码' },
  { id: 'html-entity', name: 'HTML 实体', icon: 'code', category: '编码/解码' },
  { id: 'unicode', name: 'Unicode', icon: 'globe', category: '编码/解码' },
  // 格式化
  { id: 'json', name: 'JSON 格式化', icon: 'braces', category: '格式化' },
  // 转换
  { id: 'timestamp', name: '时间戳转换', icon: 'clock', category: '转换' },
  { id: 'color', name: '颜色转换', icon: 'palette', category: '转换' },
  { id: 'number-base', name: '进制转换', icon: 'hash', category: '转换' },
  // 生成
  { id: 'uuid', name: 'UUID 生成', icon: 'key', category: '生成' },
  { id: 'password', name: '随机密码', icon: 'lock', category: '生成' },
  { id: 'hash', name: 'Hash 计算', icon: 'shield-check', category: '生成' },
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
  <div class="min-h-screen">
    <!-- 导航栏 -->
    <Navbar />

    <!-- 主内容 -->
    <main class="max-w-7xl mx-auto px-6 py-10">
      <!-- 页头 -->
      <div class="mb-8">
        <p class="eyebrow">
          Dev Tools
        </p>
        <h2 class="font-display text-[clamp(1.7rem,3.2vw,2.3rem)] font-bold tracking-[-0.02em] leading-[1.2] mb-2">
          开发工具箱
        </h2>
        <p class="text-muted max-w-[60ch]">
          编码解码 / 格式化 / 转换 / 生成，日常顺手的小工具都在这。
        </p>
      </div>

      <div class="flex gap-6 h-[calc(100vh-320px)] min-h-[480px]">
        <!-- 左侧：工具列表 -->
        <div class="w-56 flex-shrink-0 od-card overflow-hidden flex flex-col">
          <div class="p-3 border-b border-border">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索工具..."
              class="od-input !py-2 !text-sm"
            >
          </div>
          <div class="p-2 flex-1 overflow-y-auto">
            <template
              v-for="category in categories"
              :key="category"
            >
              <div
                v-if="toolsOfCategory(category).length > 0"
                class="mb-3"
              >
                <h3 class="text-muted text-xs font-medium px-2 mb-1">
                  {{ category }}
                </h3>
                <button
                  v-for="tool in toolsOfCategory(category)"
                  :key="tool.id"
                  class="od-item w-full text-left px-3 py-2 flex items-center gap-2.5 cursor-pointer"
                  :class="[
                    selectedTool.id === tool.id
                      ? 'active text-fg'
                      : 'text-fg/70 hover:text-fg',
                  ]"
                  @click="selectedTool = tool"
                >
                  <AppIcon
                    :name="tool.icon"
                    :size="15"
                    class="shrink-0"
                    :class="selectedTool.id === tool.id ? 'text-accent-strong' : 'text-muted'"
                  />
                  <span class="text-sm">{{ tool.name }}</span>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- 右侧：工具工作区 -->
        <div class="flex-1 od-card overflow-hidden flex flex-col">
          <div class="px-6 py-4 border-b border-border flex items-center gap-3">
            <span class="w-8 h-8 rounded-[10px] grid place-items-center bg-accent-soft text-accent-strong">
              <AppIcon
                :name="selectedTool.icon"
                :size="16"
              />
            </span>
            <h2 class="text-lg font-display font-bold tracking-[-0.01em] text-fg">
              {{ selectedTool.name }}
            </h2>
          </div>
          <div class="p-6 flex-1 overflow-y-auto">
            <component :is="toolComponents[selectedTool.id]" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
