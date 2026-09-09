<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from 'reka-ui'
import { promptsApi } from '../../../lib/prompts-api'
import type { Prompt, PromptPayload } from '../../../types/prompts'

const props = defineProps<{ prompt: Prompt | null; categories: string[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const queryClient = useQueryClient()
const saving = ref(false)
const error = ref('')
const titleInput = ref<HTMLInputElement>()
const form = reactive({
  title: props.prompt?.title ?? '',
  prompt: props.prompt?.prompt ?? '',
  description: props.prompt?.description ?? '',
  category: props.prompt?.category ?? '其他创意',
  tags: props.prompt?.tags.join('，') ?? '',
  coverUrl: props.prompt?.coverUrl ?? '',
  references: props.prompt?.referenceImageUrls.join('\n') ?? '',
})
const valid = computed(() => !!form.title.trim() && !!form.prompt.trim() && !!form.category.trim() && form.category.trim() !== 'all')
onMounted(() => titleInput.value?.focus())

async function save() {
  if (saving.value || !valid.value) return
  saving.value = true
  error.value = ''
  const payload: PromptPayload = {
    title: form.title.trim(), prompt: form.prompt.trim(), description: form.description.trim(),
    category: form.category.trim(), tags: [...new Set(form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean))],
    coverUrl: form.coverUrl.trim(), referenceImageUrls: form.references.split('\n').map(t => t.trim()).filter(Boolean),
  }
  try {
    if (props.prompt) await promptsApi.update(props.prompt.id, payload)
    else await promptsApi.create(payload)
    // 所有词库实例共用服务端状态，保存后同时失效，避免侧栏继续展示旧正文。
    await queryClient.invalidateQueries({ queryKey: ['prompts'] })
    emit('saved')
  } catch (err) {
    const message = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
    error.value = Array.isArray(message) ? message.join('；') : message || '保存失败，请稍后重试'
  } finally { saving.value = false }
}
</script>

<template>
  <DialogRoot
    :open="true"
    @update:open="(open) => { if (!open && !saving) emit('close') }"
  >
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-fg/30" />
      <DialogContent
        class="prompt-editor od-card"
        @escape-key-down="(event) => { if (saving) event.preventDefault() }"
        @interact-outside.prevent
      >
        <DialogTitle class="text-lg font-bold">
          {{ prompt ? '编辑提示词' : '新增提示词' }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted">
          保存到内部词库，分类支持自行填写。
        </DialogDescription>
        <form
          class="editor-form"
          @submit.prevent="save"
        >
          <label class="od-label">标题<input
            ref="titleInput"
            v-model="form.title"
            class="od-input"
            required
            maxlength="500"
          ></label>
          <label class="od-label">分类<input
            v-model="form.category"
            class="od-input"
            list="prompt-categories"
            required
            maxlength="100"
          ></label>
          <datalist id="prompt-categories">
            <option
              v-for="category in categories"
              :key="category"
              :value="category"
            />
          </datalist>
          <label class="od-label">标签（逗号分隔）<input
            v-model="form.tags"
            class="od-input"
            placeholder="极简，人物，写实"
          ></label>
          <label class="od-label">提示词正文<textarea
            v-model="form.prompt"
            class="od-input"
            rows="9"
            required
            maxlength="100000"
          /></label>
          <label class="od-label">描述<textarea
            v-model="form.description"
            class="od-input"
            rows="2"
            maxlength="10000"
          /></label>
          <details>
            <summary class="text-sm text-muted cursor-pointer">
              封面与参考图片
            </summary>
            <label class="od-label mt-3">封面地址<input
              v-model="form.coverUrl"
              class="od-input"
              maxlength="2000"
              placeholder="https://… 或 /uploads/…"
            ></label>
            <label class="od-label mt-3">参考图片（每行一个地址）<textarea
              v-model="form.references"
              class="od-input"
              rows="3"
            /></label>
          </details>
          <p
            v-if="error"
            class="od-error"
            role="alert"
          >
            {{ error }}
          </p>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="od-btn od-btn-ghost"
              :disabled="saving"
              @click="emit('close')"
            >
              取消
            </button>
            <button
              type="submit"
              class="od-btn od-btn-primary"
              :disabled="saving || !valid"
            >
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.prompt-editor { position: fixed; z-index: 51; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(640px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 24px; }
.editor-form { display: flex; flex-direction: column; gap: 14px; margin-top: 20px; }
.editor-form .od-label { display: flex; flex-direction: column; gap: 6px; }
textarea { resize: vertical; }
</style>
