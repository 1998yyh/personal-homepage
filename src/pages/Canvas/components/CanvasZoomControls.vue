<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-zoom-controls.tsx
// 左下角缩放坞：重置视图 / 滑杆 5%-500% / 快捷键说明弹窗（antd Modal → .od-modal-overlay）。
// mini-map 开关在 Phase 6 引入。
import { ref } from 'vue';
import AppIcon from '../../../components/AppIcon.vue';

defineProps<{ scale: number }>();

const emit = defineEmits<{
  scaleChange: [scale: number];
  reset: [];
}>();

const shortcutsOpen = ref(false);

const SHORTCUTS: { label: string; value: string }[] = [
  { label: '拖拽画布空白处', value: '平移视图' },
  { label: '滚轮', value: '缩放视图' },
  { label: 'Ctrl / Cmd + 拖拽', value: '框选节点' },
  { label: 'Shift / Ctrl / Cmd + 点击', value: '多选节点' },
  { label: 'Ctrl / Cmd + C / V', value: '复制粘贴节点' },
  { label: 'Ctrl / Cmd + Z / Y', value: '撤销 / 重做' },
  { label: 'Delete / Backspace', value: '删除选中' },
];
</script>

<template>
  <div
    class="absolute bottom-5 left-5 z-50"
    @mousedown.stop
    @pointerdown.stop
  >
    <div class="flex h-14 items-center gap-1 rounded-xl border border-border bg-surface/90 px-2 shadow-lift backdrop-blur">
      <button
        type="button"
        class="grid size-8 min-w-8 place-items-center rounded-lg text-fg transition hover:bg-accent-soft"
        title="重置视图"
        aria-label="重置视图"
        @click="emit('reset')"
      >
        <AppIcon
          name="focus"
          :size="16"
        />
      </button>
      <input
        type="range"
        min="5"
        max="500"
        step="1"
        :value="Math.round(scale * 100)"
        class="w-24 accent-accent"
        title="缩放"
        aria-label="缩放"
        @input="emit('scaleChange', Number(($event.target as HTMLInputElement).value) / 100)"
      >
      <span class="w-10 text-right text-xs tabular-nums text-muted">{{ Math.round(scale * 100) }}%</span>
      <button
        type="button"
        class="grid size-8 min-w-8 place-items-center rounded-lg text-fg transition hover:bg-accent-soft"
        :class="{ 'bg-accent-soft': shortcutsOpen }"
        title="快捷键"
        aria-label="快捷键"
        @click="shortcutsOpen = true"
      >
        <AppIcon
          name="help-circle"
          :size="16"
        />
      </button>
    </div>

    <!-- 快捷键说明 -->
    <div
      v-if="shortcutsOpen"
      class="od-modal-overlay"
      @click.self="shortcutsOpen = false"
    >
      <div class="od-card w-full max-w-sm p-6">
        <h2 class="font-display text-lg font-bold text-fg mb-4">
          快捷键
        </h2>
        <div class="space-y-3 border-t border-border pt-4 text-sm">
          <div
            v-for="item in SHORTCUTS"
            :key="item.label"
            class="flex items-center justify-between gap-4"
          >
            <span class="font-medium text-fg">{{ item.label }}</span>
            <span class="text-muted">{{ item.value }}</span>
          </div>
        </div>
        <button
          class="od-btn od-btn-ghost mt-6 w-full"
          @click="shortcutsOpen = false"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>
