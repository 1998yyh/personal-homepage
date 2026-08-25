<script setup lang="ts">
// 全局 toast 渲染层：右上角堆叠，自动消隐，可手动关闭
// Teleport 到 body（画布在 CSS transform 世界里，fixed 会失真）；z-[100] 压过 modal(50)/drawer(51)
import { dismissToast, toasts } from '../composables/useToast';
import AppIcon from './AppIcon.vue';
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="item in toasts"
          :key="item.id"
          class="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 shadow-lift"
          role="alert"
        >
          <span
            class="mt-0.5 shrink-0"
            :class="item.type === 'error' ? 'text-danger' : 'text-success'"
          >
            <AppIcon
              :name="item.type === 'error' ? 'alert-circle' : 'check'"
              :size="16"
            />
          </span>
          <p class="min-w-0 flex-1 text-sm leading-5 text-fg break-words">
            {{ item.message }}
          </p>
          <button
            type="button"
            class="mt-0.5 shrink-0 text-muted transition hover:text-fg"
            aria-label="关闭提示"
            @click="dismissToast(item.id)"
          >
            <AppIcon
              name="x"
              :size="14"
            />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
