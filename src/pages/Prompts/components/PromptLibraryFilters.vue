<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ categories: string[]; total: number }>()
const category = defineModel<string>('category', { required: true })
const categoryOptions = computed(() => [...new Set([...props.categories, ...(category.value === 'all' ? [] : [category.value])])])
</script>
<template>
  <div class="library-filters">
    <select
      v-model="category"
      class="od-input"
      aria-label="筛选分类"
    >
      <option value="all">
        全部分类
      </option><option
        v-for="name in categoryOptions"
        :key="name"
        :value="name"
      >
        {{ name }}
      </option>
    </select>
    <span class="text-xs text-muted">{{ total }} 条</span>
  </div>
</template>
<style scoped>
.library-filters { display: flex; align-items: center; gap: 6px; padding: 0 12px 10px; flex-wrap: wrap; }
.library-filters select { flex: 1; min-width: 0; width: 100px; font-size: 12px; }
</style>
