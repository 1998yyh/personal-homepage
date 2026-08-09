<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-node.tsx 的 AudioNodeContent
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
    class="flex h-full w-full flex-col justify-center gap-3 bg-surface px-4 text-fg"
  >
    <div class="flex min-w-0 items-center gap-2 text-sm opacity-70">
      <AppIcon
        name="music"
        :size="16"
        class="shrink-0"
      />
      <span class="truncate">{{ node.title || '音频' }}</span>
    </div>
    <audio
      :src="src"
      controls
      class="w-full"
      data-canvas-no-zoom
    />
  </div>
  <div
    v-else
    class="flex h-full w-full flex-col items-center justify-center gap-2 text-muted"
  >
    <AppIcon
      name="music"
      :size="28"
      class="opacity-35"
    />
    <span class="text-sm">空音频</span>
    <span class="text-xs opacity-60">双击上传音频</span>
  </div>
</template>
