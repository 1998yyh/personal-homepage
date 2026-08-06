<script setup lang="ts">
// 共享空态：未登录引导 / 无数据两种场景（MCP、Skills 等管理页复用）
import AppIcon from './AppIcon.vue'

defineProps<{
  icon: string
  title: string
  description?: string
  /** 主操作按钮文案；不传则不显示按钮 */
  actionText?: string
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="od-card py-20 text-center">
    <div class="w-14 h-14 rounded-2xl bg-accent text-white grid place-items-center mx-auto mb-4">
      <AppIcon
        :name="icon"
        :size="26"
      />
    </div>
    <p class="text-fg font-medium mb-1.5">
      {{ title }}
    </p>
    <p
      v-if="description"
      class="text-muted text-sm"
      :class="{ 'mb-6': actionText }"
    >
      {{ description }}
    </p>
    <button
      v-if="actionText"
      class="od-btn od-btn-primary mx-auto"
      @click="emit('action')"
    >
      {{ actionText }}
    </button>
  </div>
</template>
