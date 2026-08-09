<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-node.tsx 的 GroupNodeContent
import AppIcon from '../../../components/AppIcon.vue';

defineProps<{ childCount: number }>();
</script>

<template>
  <div class="pointer-events-none flex h-full w-full flex-col p-4">
    <div class="flex items-center gap-2 text-sm font-semibold text-fg">
      <span class="grid size-8 place-items-center rounded-xl bg-accent-soft text-muted">
        <AppIcon
          name="group"
          :size="16"
        />
      </span>
      <span>分组</span>
      <span class="ml-auto rounded-full bg-surface px-2 py-1 text-[11px] font-medium text-muted">
        {{ childCount }} 个节点
      </span>
    </div>
    <div class="mt-3 flex-1 rounded-2xl border border-dashed border-border bg-surface/35" />
  </div>
</template>
