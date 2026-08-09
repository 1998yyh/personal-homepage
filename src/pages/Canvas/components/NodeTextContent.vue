<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-node.tsx 的 TextContent
// 双击进入编辑（textarea），点击外部/Esc 结束；滚轮拦截防止缩放画布；字号走 metadata.fontSize。
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { CanvasNodeType, type CanvasNodeData } from '../../../types/canvas';
import { NODE_DEFAULT_SIZE } from '../../../lib/canvas/canvas-node-factory';
import { useCanvasStore } from '../../../stores/canvas';

const props = withDefaults(defineProps<{ node: CanvasNodeData; editRequestNonce?: number }>(), { editRequestNonce: 0 });

const store = useCanvasStore();
const isEditing = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const textStyle = computed(() => {
  const fontSize = props.node.metadata?.fontSize || 14;
  return { fontSize: `${fontSize}px`, lineHeight: `${Math.round(fontSize * 1.65)}px`, boxSizing: 'border-box' as const };
});

// 外部请求进入编辑（如未来的「编辑文本」工具栏按钮）
watch(
  () => props.editRequestNonce,
  (nonce) => {
    if (nonce) isEditing.value = true;
  },
);

watch(isEditing, async (editing) => {
  if (!editing) return;
  await nextTick();
  const textarea = textareaRef.value;
  textarea?.focus();
  textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
});

// 编辑时点击节点外任意处结束编辑
function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (textareaRef.value?.contains(target)) return;
  isEditing.value = false;
}

watch(isEditing, (editing) => {
  if (editing) window.addEventListener('pointerdown', handleOutsidePointerDown, true);
  else window.removeEventListener('pointerdown', handleOutsidePointerDown, true);
});

// textarea 滚轮不冒泡到画布缩放（原生监听器，passive:false）
watch(
  [textareaRef, isEditing],
  ([textarea], _, onCleanup) => {
    if (!textarea) return;
    const stop = (event: WheelEvent) => event.stopPropagation();
    textarea.addEventListener('wheel', stop, { passive: false });
    onCleanup(() => textarea.removeEventListener('wheel', stop));
  },
  { flush: 'post' },
);

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleOutsidePointerDown, true);
});

function handleInput(event: Event) {
  store.updateNodeMetadata(props.node.id, { content: (event.target as HTMLTextAreaElement).value });
}

// 「生成」：以本文本为提示词创建一个 config 节点并连线（文本 → 配置）
function createConfigFromText() {
  const node = props.node;
  const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Config];
  const configNode = store.addNode(
    CanvasNodeType.Config,
    {
      x: node.position.x + node.width + 80 + spec.width / 2,
      y: node.position.y + node.height / 2,
    },
    { prompt: node.metadata?.content || '', generationMode: 'image' },
  );
  store.connectNodes({ nodeId: node.id, handleType: 'source' }, configNode.id);
}

defineExpose({ startEditing: () => (isEditing.value = true) });
</script>

<template>
  <div
    class="group relative flex h-full w-full flex-col overflow-hidden pt-8"
    @dblclick.stop="isEditing = true"
  >
    <textarea
      v-if="isEditing"
      ref="textareaRef"
      :value="node.metadata?.content || ''"
      class="thin-scrollbar m-0 block h-full w-full resize-none appearance-none overflow-y-auto whitespace-pre-wrap break-words border-none bg-transparent pb-4 pl-4 pr-4 pt-0 font-mono text-fg outline-none select-text"
      :style="textStyle"
      @input="handleInput"
      @blur="isEditing = false"
      @keydown.esc="isEditing = false"
      @mousedown.stop
      @pointerdown.stop
      @wheel.stop
    />
    <div
      v-else
      class="thin-scrollbar block h-full w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent pb-4 pl-4 pr-4 pt-0 font-mono text-fg"
      :style="textStyle"
      @wheel.stop
    >
      {{ node.metadata?.content || '' }}
      <span
        v-if="!node.metadata?.content"
        class="text-muted"
      >双击编辑文本</span>
    </div>

    <!-- 以本文本为提示词发起生成 -->
    <button
      v-if="!isEditing && node.metadata?.content?.trim()"
      type="button"
      class="absolute bottom-2 right-2 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
      title="以此文本为提示词创建生成配置"
      data-canvas-no-zoom
      @pointerdown.stop
      @mousedown.stop
      @click.stop="createConfigFromText"
    >
      生成
    </button>
  </div>
</template>
