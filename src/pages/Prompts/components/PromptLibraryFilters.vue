<script setup lang="ts">
import { computed } from 'vue'
import OdSelect from '../../../components/ui/OdSelect.vue'

const props = defineProps<{ categories: string[]; total: number }>()
const category = defineModel<string>('category', { required: true })
const categoryOptions = computed(() => {
  const names = [...new Set([
    ...props.categories,
    ...(category.value === 'all' ? [] : [category.value]),
  ])]
  return [
    { value: 'all', label: '全部分类' },
    ...names.map((name) => ({ value: name, label: name })),
  ]
})
</script>
<template>
  <div class="library-filters">
    <div class="library-filters-select">
      <OdSelect
        v-model="category"
        compact
        aria-label="筛选分类"
        :options="categoryOptions"
      />
    </div>
    <span class="text-xs text-muted">{{ total }} 条</span>
  </div>
</template>
<style scoped>
.library-filters { display: flex; align-items: center; gap: 6px; padding: 0 12px 10px; flex-wrap: wrap; }
.library-filters-select { flex: 1; min-width: 0; }
</style>
