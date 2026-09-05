<script setup lang="ts">
// 提示词库引用弹层：搜一条提示词填入当前 prompt 输入框（复用 promptsApi.fetchPrompts）。
import { ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { promptsApi } from '../../../lib/prompts-api'
import AppIcon from '../../../components/AppIcon.vue'

const emit = defineEmits<{ close: []; select: [text: string] }>()

const keyword = ref('')
const { data, isFetching } = useQuery({
  queryKey: ['studio-prompt-picker', keyword],
  queryFn: () => promptsApi.fetchPrompts({ keyword: keyword.value || undefined, pageSize: 20 }),
})
</script>

<template>
  <div
    class="od-modal-overlay"
    @click.self="emit('close')"
  >
    <div class="od-panel flex max-h-[70vh] w-[min(560px,92vw)] flex-col p-5">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-fg">
          从提示词库选
        </h3>
        <button
          class="od-icon-btn"
          aria-label="关闭"
          @click="emit('close')"
        >
          <AppIcon
            name="x"
            :size="16"
          />
        </button>
      </div>

      <input
        v-model="keyword"
        class="od-input mt-4 w-full"
        placeholder="搜索提示词标题 / 内容…"
      >

      <div class="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        <p
          v-if="isFetching"
          class="py-6 text-center text-sm text-muted"
        >
          加载中…
        </p>
        <p
          v-else-if="!data?.items.length"
          class="py-6 text-center text-sm text-muted"
        >
          没有匹配的提示词
        </p>
        <button
          v-for="p in data?.items ?? []"
          :key="p.id"
          class="od-item w-full text-left"
          @click="emit('select', p.prompt)"
        >
          <span class="block truncate text-sm font-medium text-fg">{{ p.title }}</span>
          <span class="mt-0.5 line-clamp-2 block text-xs text-muted">{{ p.prompt }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
