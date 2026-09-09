import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { promptsApi } from '../../../lib/prompts-api'
import { useAuthStore } from '../../../stores/auth'
import type { PromptListResponse } from '../../../types/prompts'

export function usePromptLibrary() {
  const auth = useAuthStore()
  const keyword = ref('')
  const debouncedKeyword = ref('')
  const category = ref('all')
  const page = ref(1)
  watch(category, () => { page.value = 1 })
  const pageSize = 12
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(keyword, (value) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debouncedKeyword.value = value.trim()
      page.value = 1
    }, 300)
  })
  onBeforeUnmount(() => clearTimeout(timer))
  const userId = computed(() => auth.user?.id)
  const query = useQuery<PromptListResponse>({
    queryKey: computed(() => [
      'prompts',
      userId.value,
      {
        keyword: debouncedKeyword.value,
        category: category.value,
        page: page.value,
      },
    ]),
    queryFn: ({ signal }) =>
      promptsApi.fetchPrompts(
        {
          keyword: debouncedKeyword.value || undefined,
          category: category.value,
          page: page.value,
          pageSize,
        },
        signal,
      ),
    enabled: computed(() => auth.isAuthenticated),
    // 相同查询五分钟内复用；翻页保留结果，避免侧栏闪空。跨用户不复用占位数据。
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    placeholderData: computed(() => {
      const owner = userId.value
      return (
        previous: PromptListResponse | undefined,
        previousQuery: { queryKey: readonly unknown[] } | undefined,
      ) => (previousQuery?.queryKey[1] === owner ? previous : undefined)
    }),
  })
  const totalPages = computed(() =>
    Math.max(1, Math.ceil((query.data.value?.total ?? 0) / pageSize)),
  )
  watch([query.data, query.isPlaceholderData], ([data, placeholder]) => {
    if (data && !placeholder && page.value > totalPages.value)
      page.value = totalPages.value
  })
  function resetFilters() {
    category.value = 'all'
    keyword.value = ''
    debouncedKeyword.value = ''
    page.value = 1
  }
  return {
    ...query,
    keyword,
    category,
    debouncedKeyword,
    page,
    totalPages,
    resetFilters,
  }
}
