<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-create-menus.tsx（NodeCreateMenu / ConnectionCreateMenu 合并）
// 世界坐标处的节点创建菜单：双击空白 / 连线落空白时弹出。
import { onBeforeUnmount, onMounted } from 'vue';
import { CanvasNodeType, type CanvasNodeTypeId, type Position } from '../../../types/canvas';
import AppIcon from '../../../components/AppIcon.vue';

withDefaults(defineProps<{ position: Position; connectionMode?: boolean }>(), { connectionMode: false });

const emit = defineEmits<{
  select: [type: CanvasNodeTypeId];
  close: [];
}>();

const allItems: { type: CanvasNodeTypeId; label: string; icon: string }[] = [
  { type: CanvasNodeType.Text, label: '文本', icon: 'type' },
  { type: CanvasNodeType.Image, label: '图片', icon: 'image' },
  { type: CanvasNodeType.Video, label: '视频', icon: 'video' },
  { type: CanvasNodeType.Audio, label: '音频', icon: 'music' },
  { type: CanvasNodeType.Config, label: '生成配置', icon: 'sliders' },
  { type: CanvasNodeType.Group, label: '分组', icon: 'group' },
];

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target;
  if (target instanceof Element && target.closest('[data-connection-create-menu]')) return;
  emit('close');
}

onMounted(() => {
  window.addEventListener('pointerdown', handleOutsidePointerDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleOutsidePointerDown, true);
});
</script>

<template>
  <div
    class="absolute z-[90] min-w-40 overflow-hidden rounded-xl border border-border bg-surface/95 py-1 shadow-lift backdrop-blur"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    data-connection-create-menu
    data-canvas-no-zoom
    @pointerdown.stop
  >
    <div class="px-3 pb-1 pt-1.5 text-[11px] font-medium text-muted">
      {{ connectionMode ? '创建并连接' : '创建节点' }}
    </div>
    <button
      v-for="item in allItems"
      :key="item.type"
      type="button"
      class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-accent-soft"
      @click="emit('select', item.type)"
    >
      <AppIcon
        :name="item.icon"
        :size="16"
      />
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>
