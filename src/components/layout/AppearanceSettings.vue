<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import { useTheme } from '../../composables/useTheme'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const { theme, setTheme, storageMessage } = useTheme()
const options = [
  { key: 'dark', label: '深色苔绿', description: '炭黑底色 · 柔和苔绿' },
  { key: 'light', label: '米白陶土', description: '暖米白底色 · 陶土橙' },
] as const
watch(() => props.open, async (open) => {
  await nextTick()
  if (open && !dialog.value?.open) dialog.value?.showModal()
  else if (!open) dialog.value?.close()
}, { immediate: true })
</script>

<template>
  <dialog
    ref="dialog"
    class="appearance-dialog"
    aria-labelledby="appearance-title"
    @close="emit('close')"
    @click="event => { if (event.target === dialog) dialog?.close() }"
  >
    <div class="appearance-heading">
      <span>设置 / 外观</span><button
        class="od-icon-btn"
        aria-label="关闭设置"
        autofocus
        @click="dialog?.close()"
      >
        <AppIcon
          name="x"
          :size="18"
        />
      </button>
    </div>
    <h2 id="appearance-title">
      选择你喜欢的外观
    </h2>
    <p>为你的 AI 工作空间，选一个舒服的颜色。</p>
    <div
      class="appearance-options"
      role="group"
      aria-label="外观方案"
    >
      <button
        v-for="option in options"
        :key="option.key"
        class="appearance-option"
        :class="{ selected: theme === option.key }"
        :aria-pressed="theme === option.key"
        @click="setTheme(option.key)"
      >
        <span
          class="appearance-sample"
          :class="option.key"
          aria-hidden="true"
        ><i /><span><b /><em /><em /></span></span>
        <span class="appearance-label">{{ option.label }}<AppIcon
          v-if="theme === option.key"
          name="check"
          :size="17"
        /></span>
        <small>{{ option.description }}</small>
      </button>
    </div>
    <p
      class="appearance-notice"
      role="status"
    >
      {{ storageMessage || '选择后立即生效，并保存在此浏览器。' }}
    </p>
    <button
      class="od-btn od-btn-primary od-btn-block"
      @click="dialog?.close()"
    >
      完成
    </button>
  </dialog>
</template>

<style scoped>
.appearance-dialog{position:fixed;inset:0;margin:auto;background:var(--surface);color:var(--fg);border:1px solid var(--border);border-radius:20px;padding:28px;max-width:490px;width:calc(100vw - 32px);max-height:90dvh;overflow:auto;box-shadow:var(--shadow-lift)}.appearance-dialog::backdrop{background:#0006;backdrop-filter:blur(5px)}.appearance-heading{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:12px;margin-bottom:16px}.appearance-heading .od-icon-btn{border:0;background:transparent}.appearance-dialog h2{font-size:23px;font-weight:600;letter-spacing:-.035em}.appearance-dialog p{color:var(--muted);font-size:13px;margin:14px 0}.appearance-options{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:24px 0}.appearance-option{text-align:left;background:transparent;border:1px solid var(--border);border-radius:12px;padding:12px;color:inherit;min-width:0;cursor:pointer}.appearance-option.selected{outline:2px solid var(--accent);outline-offset:2px}.appearance-label{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:550;margin-top:12px}.appearance-option.selected .appearance-label{color:var(--accent-strong)}.appearance-option small{font-size:11px;color:var(--muted)}.appearance-sample{display:flex;gap:10px;border-radius:7px;height:95px;padding:10px;background:#111314}.appearance-sample>i{width:24%;border-radius:3px;background:#293321}.appearance-sample>span{flex:1;padding-top:4px}.appearance-sample b{display:block;height:10px;width:65%;background:#cbe699;border-radius:3px;margin-bottom:13px}.appearance-sample em{display:block;height:10px;background:#252b24;border-radius:3px;margin-top:7px}.appearance-sample.light{background:#f8f4ec;border:1px solid #ddd0bf}.light>i{background:#e5dbcf}.light b{background:#a65b40}.light em{background:#eae0d3}.appearance-notice{min-height:38px}
</style>
