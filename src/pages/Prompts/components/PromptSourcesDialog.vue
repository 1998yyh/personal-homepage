<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { promptsApi } from '../../../lib/prompts-api'
import type { PromptSourceView } from '../../../types/prompts'
import { useAuthStore } from '../../../stores/auth'
import AppIcon from '../../../components/AppIcon.vue'
const emit = defineEmits<{ close: []; changed: [] }>()
const auth = useAuthStore()
const client = useQueryClient()
const dialog = ref<HTMLDialogElement | null>(null)
const showForm = ref(false)
const form = reactive({ name: '', url: '', homepage: '' })
const message = ref('')
const error = ref('')
const deleting = ref<PromptSourceView | null>(null)
onMounted(() => dialog.value?.showModal())
// 抽屉打开才挂载查询，不占用图库首次进入时的网络资源；用户维度隔离配置缓存。
const sources = useQuery({
  queryKey: ['prompt-sources', auth.user?.id],
  queryFn: () => promptsApi.listSources(),
  staleTime: 300_000,
})
const statuses = useQuery({
  queryKey: ['prompt-source-statuses', auth.user?.id],
  queryFn: () => promptsApi.fetchSourceStatuses(),
  staleTime: 0,
})
type Action =
  | { type: 'toggle' | 'refresh' | 'delete'; source: PromptSourceView }
  | { type: 'create' | 'refresh-all' }
const mutation = useMutation({
  mutationFn: async (action: Action) => {
    error.value = ''
    message.value = ''
    switch (action.type) {
      case 'create':
        await promptsApi.createSource({
          name: form.name.trim(),
          url: form.url.trim(),
          homepage: form.homepage.trim() || undefined,
        })
        showForm.value = false
        form.name = ''
        form.url = ''
        form.homepage = ''
        message.value = '提示词源已添加'
        break
      case 'toggle':
        await promptsApi.updateSource(action.source.id, {
          isActive: !action.source.isActive,
        })
        message.value = '启用状态已更新'
        break
      case 'delete':
        await promptsApi.removeSource(action.source.id)
        deleting.value = null
        message.value = '提示词源已删除'
        break
      case 'refresh':
        await promptsApi.refreshSource(action.source.id)
        message.value = '提示词源已刷新'
        break
      case 'refresh-all': {
        const result = await promptsApi.refreshAllSources()
        message.value = `刷新完成：${result.successCount} 个成功，${result.failureCount} 个失败`
        break
      }
    }
  },
  onSuccess: () => {
    emit('changed')
  },
  onError: () => {
    error.value = '操作失败，请检查源地址或网络后重试'
  },
  // 失败刷新也会更新服务端状态，必须重新获取；列表缓存一并失效，词库栏会换成新源。
  onSettled: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['prompt-sources'] }),
      client.invalidateQueries({ queryKey: ['prompt-source-statuses'] }),
      client.invalidateQueries({ queryKey: ['prompts'] }),
    ])
  },
})
const pending = computed(() => mutation.isPending.value)
function submit() {
  if (!form.name.trim()) {
    error.value = '请填写源名称'
    return
  }
  mutation.mutate({ type: 'create' })
}
</script>

<template>
  <dialog
    ref="dialog"
    class="sources-dialog"
    aria-labelledby="sources-title"
    @close="emit('close')"
    @click="$event.target === dialog && dialog?.close()"
  >
    <header>
      <div>
        <span class="text-muted text-xs">管理来源</span>
        <h2 id="sources-title">
          提示词源
        </h2>
      </div>
      <button
        class="od-icon-btn"
        aria-label="关闭源管理"
        @click="dialog?.close()"
      >
        <AppIcon name="x" />
      </button>
    </header>
    <p class="intro">
      管理你的灵感来源。刷新后，词库会自动更新。
    </p>
    <div class="actions">
      <button
        class="od-btn od-btn-primary"
        :disabled="pending"
        @click="showForm = !showForm"
      >
        <AppIcon name="plus" />{{
          showForm ? '收起表单' : '添加自建源'
        }}
      </button><button
        class="od-btn od-btn-ghost"
        :disabled="pending"
        @click="mutation.mutate({ type: 'refresh-all' })"
      >
        <AppIcon name="refresh-cw" />{{
          pending && mutation.variables.value?.type === 'refresh-all'
            ? '刷新中…'
            : '刷新全部源'
        }}
      </button>
    </div>
    <p
      v-if="message"
      role="status"
      class="feedback"
    >
      {{ message }}
    </p>
    <p
      v-if="error"
      role="alert"
      class="od-error"
    >
      {{ error }}
    </p>
    <form
      v-if="showForm"
      class="source-form od-panel"
      @submit.prevent="submit"
    >
      <label>源名称<input
        v-model="form.name"
        class="od-input"
        placeholder="例如：我的提示词收藏"
        required
      ></label>
      <label>源 JSON 地址<input
        v-model="form.url"
        type="url"
        class="od-input"
        placeholder="https://…"
        pattern="https?://.+"
        required
      ></label>
      <label>主页（可选）<input
        v-model="form.homepage"
        type="url"
        class="od-input"
        placeholder="https://…"
        pattern="https?://.+"
      ></label>
      <button
        class="od-btn od-btn-primary"
        :disabled="pending"
      >
        {{ pending ? '保存中…' : '添加提示词源' }}
      </button>
    </form>
    <div
      v-if="sources.isPending.value"
      class="loading"
      role="status"
    >
      正在加载提示词源…
    </div>
    <div
      v-else-if="sources.isError.value"
      class="loading"
    >
      <p>提示词源加载失败</p>
      <button
        class="od-btn od-btn-ghost"
        @click="sources.refetch()"
      >
        重试
      </button>
    </div>
    <p
      v-else-if="!sources.data.value?.length"
      class="loading"
    >
      还没有提示词源，添加一个开始浏览。
    </p>
    <p
      v-if="statuses.isError.value"
      class="text-muted text-xs"
    >
      源状态暂不可用。<button
        class="text-accent-strong"
        @click="statuses.refetch()"
      >
        重试
      </button>
    </p>
    <article
      v-for="source in sources.data.value ?? []"
      :key="source.id"
      class="source-row"
    >
      <div class="source-title">
        <h3>{{ source.name }}</h3>
        <span v-if="source.isBuiltin">内置</span>
      </div>
      <p
        v-if="statuses.data.value?.[source.id]?.lastError"
        class="od-error"
      >
        抓取失败：{{ statuses.data.value[source.id]?.lastError }}
      </p>
      <p
        v-else
        class="source-meta"
      >
        {{ statuses.data.value?.[source.id]?.count ?? '—' }} 条提示词
      </p>
      <div class="source-actions">
        <button
          class="od-btn"
          :class="source.isActive ? 'od-btn-soft' : 'od-btn-ghost'"
          :disabled="pending"
          :aria-label="`${source.isActive ? '停用' : '启用'} ${source.name}`"
          @click="mutation.mutate({ type: 'toggle', source })"
        >
          <AppIcon
            :name="source.isActive ? 'check' : 'plus'"
            :size="14"
          />{{
            source.isActive ? '已启用' : '已停用'
          }}
        </button><button
          class="od-icon-btn"
          :disabled="pending"
          :aria-label="`刷新 ${source.name}`"
          @click="mutation.mutate({ type: 'refresh', source })"
        >
          <AppIcon name="refresh-cw" />
        </button><button
          v-if="!source.isBuiltin"
          class="od-icon-btn"
          :disabled="pending"
          :aria-label="`删除 ${source.name}`"
          @click="deleting = source"
        >
          <AppIcon name="trash-2" />
        </button>
      </div>
      <div
        v-if="deleting?.id === source.id"
        class="delete-confirm"
      >
        <p>确定删除「{{ source.name }}」吗？</p>
        <button
          class="od-btn od-btn-ghost"
          :disabled="pending"
          @click="deleting = null"
        >
          取消
        </button><button
          class="od-btn od-btn-ghost text-danger"
          :disabled="pending"
          @click="mutation.mutate({ type: 'delete', source })"
        >
          确认删除
        </button>
      </div>
    </article>
  </dialog>
</template>

<style scoped>
.sources-dialog {
  margin: 0 0 0 auto;
  width: 480px;
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  overflow: auto;
  padding: 28px;
  background: var(--surface);
  color: var(--fg);
  border: 0;
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lift);
}
.sources-dialog::backdrop {
  background: #101d2c80;
  backdrop-filter: blur(3px);
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
h2 {
  font-size: 25px;
  font-weight: 600;
  margin-top: 6px;
}
.intro {
  font-size: 12px;
  color: var(--muted);
  margin: 16px 0 24px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.source-form {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 20px 0;
}
.source-form label {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.feedback {
  font-size: 12px;
  color: var(--accent-strong);
  margin: 15px 0;
}
.loading {
  padding: 40px 0;
  color: var(--muted);
  font-size: 13px;
}
.source-row {
  padding: 22px 0;
  border-bottom: 1px solid var(--border);
}
.source-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.source-title h3 {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.source-title span {
  font-size: 10px;
  color: var(--muted);
  background: var(--bg);
  padding: 3px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.source-meta {
  font-size: 12px;
  color: var(--muted);
  margin: 8px 0;
}
.source-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.delete-confirm {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 12px;
}
.delete-confirm p {
  margin-bottom: 12px;
}
.delete-confirm button {
  margin-right: 8px;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: default;
}
@media (max-width: 480px) {
  .sources-dialog {
    padding: 20px;
  }
}
</style>
