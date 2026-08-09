<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-context-menu.tsx
// 节点/连线右键菜单：创建副本（仅节点）+ 删除；点击外部关闭。
import { onBeforeUnmount, onMounted } from 'vue';
import type { ContextMenuState } from '../../../types/canvas';
import AppIcon from '../../../components/AppIcon.vue';

defineProps<{ menu: ContextMenuState }>();

const emit = defineEmits<{
  close: [];
  duplicate: [];
  delete: [];
}>();

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target;
  if (target instanceof Element && target.closest('[data-canvas-context-menu]')) return;
  emit('close');
}

onMounted(() => {
  window.addEventListener('pointerdown', handleOutsidePointerDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleOutsidePointerDown);
});
</script>

<template>
  <div
    class="fixed z-[80] min-w-44 overflow-hidden rounded-xl border border-border bg-surface/95 py-1 shadow-lift backdrop-blur"
    :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
    data-canvas-context-menu
    @pointerdown.stop
  >
    <button
      v-if="menu.type === 'node'"
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-accent-soft"
      @click="emit('duplicate')"
    >
      <AppIcon
        name="copy"
        :size="16"
      />
      <span>创建副本</span>
    </button>
    <button
      type="button"
      class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-danger transition-colors hover:bg-accent-soft"
      @click="emit('delete')"
    >
      <AppIcon
        name="trash-2"
        :size="16"
      />
      <span>删除</span>
    </button>
  </div>
</template>
