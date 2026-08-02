<script setup lang="ts">
// 共享删除确认弹窗（.od-modal-overlay 全屏遮罩）
defineProps<{
  /** 弹窗标题，如「删除 Skill」 */
  title: string
  /** 确认文案，如「确定删除「xxx」吗？……」 */
  message: string
  deleting?: boolean
  error?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <div
    class="od-modal-overlay"
    @click.self="emit('cancel')"
  >
    <div class="od-card w-full max-w-sm p-6">
      <h2 class="font-display text-lg font-bold text-fg mb-2">
        {{ title }}
      </h2>
      <p class="text-muted text-sm mb-6">
        {{ message }}
      </p>
      <p
        v-if="error"
        class="od-error mb-4"
      >
        删除失败，请稍后重试
      </p>
      <div class="flex gap-3">
        <button
          class="od-btn od-btn-ghost flex-1"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          class="od-btn flex-1 bg-danger text-white hover:opacity-90"
          :disabled="deleting"
          @click="emit('confirm')"
        >
          {{ deleting ? '删除中...' : '确认删除' }}
        </button>
      </div>
    </div>
  </div>
</template>
