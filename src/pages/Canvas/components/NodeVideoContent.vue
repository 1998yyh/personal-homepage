<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-node.tsx 的 VideoNodeContent
import { computed } from 'vue';
import type { CanvasNodeData } from '../../../types/canvas';
import { mediaUrl } from '../../../lib/media-api';
import AppIcon from '../../../components/AppIcon.vue';

const props = defineProps<{ node: CanvasNodeData }>();

const src = computed(() => mediaUrl(props.node.metadata?.content || ''));
</script>

<template>
  <video
    v-if="node.metadata?.content"
    :src="src"
    controls
    class="h-full w-full rounded-[18px] bg-black object-contain"
    data-canvas-no-zoom
  />
  <div
    v-else
    class="flex h-full w-full flex-col items-center justify-center gap-3 text-muted"
  >
    <AppIcon
      name="video"
      :size="28"
      class="opacity-35"
    />
    <span class="text-sm">空视频</span>
    <span class="text-xs opacity-60">双击上传视频</span>
  </div>
</template>
