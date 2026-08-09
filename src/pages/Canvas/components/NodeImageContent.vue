<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-node.tsx 的 ImageNodeContent / EmptyImageContent
// 有内容：img object-contain（freeResize 时 object-fill）；无内容：占位图标。
import { computed } from 'vue';
import type { CanvasNodeData } from '../../../types/canvas';
import { mediaUrl } from '../../../lib/media-api';
import AppIcon from '../../../components/AppIcon.vue';

const props = defineProps<{ node: CanvasNodeData }>();

const src = computed(() => mediaUrl(props.node.metadata?.content || ''));
</script>

<template>
  <div
    v-if="node.metadata?.content"
    class="h-full w-full overflow-hidden rounded-3xl"
  >
    <img
      :src="src"
      :alt="node.title"
      draggable="false"
      class="pointer-events-none block h-full w-full select-none"
      :class="node.metadata?.freeResize ? 'object-fill' : 'object-contain'"
      @dragstart.prevent
    >
  </div>
  <div
    v-else
    class="flex h-full w-full flex-col items-center justify-center gap-3 text-muted"
  >
    <div class="flex size-14 items-center justify-center rounded-2xl bg-accent-soft">
      <AppIcon
        name="image"
        :size="24"
        class="opacity-30"
      />
    </div>
    <span class="text-[10px] tracking-[0.18em] opacity-50">空图片</span>
    <span class="text-[11px] opacity-60">双击上传图片</span>
  </div>
</template>
