<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/canvas-node.tsx（814 行）
// 节点卡片：标题浮签（双击改名）、四角 resize、左右连接点、按类型分发内容子组件、
// loading/error 状态层。主题对象 → 设计令牌 Tailwind 类；批次堆叠动效裁简（保留计数徽标）。
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { CanvasNodeType, type CanvasNodeData } from '../../../types/canvas';
import { useCanvasStore } from '../../../stores/canvas';
import { useNodeResize, type ResizeCorner } from '../composables/useNodeResize';
import NodeTextContent from './NodeTextContent.vue';
import NodeImageContent from './NodeImageContent.vue';
import NodeVideoContent from './NodeVideoContent.vue';
import NodeAudioContent from './NodeAudioContent.vue';
import NodeGroupContent from './NodeGroupContent.vue';
import NodeConfigContent from './NodeConfigContent.vue';
import AppIcon from '../../../components/AppIcon.vue';

const props = withDefaults(
  defineProps<{
    node: CanvasNodeData;
    isSelected: boolean;
    isRelated: boolean;
    isFocusRelated: boolean;
    isConnectionTarget: boolean;
    isConnecting: boolean;
    editRequestNonce?: number;
    showImageInfo: boolean;
    groupChildCount?: number;
    isGroupDropTarget?: boolean;
  }>(),
  { editRequestNonce: 0, groupChildCount: 0, isGroupDropTarget: false },
);

const emit = defineEmits<{
  mouseDown: [event: MouseEvent, nodeId: string];
  selectCapture: [event: MouseEvent, nodeId: string];
  hoverStart: [nodeId: string];
  hoverEnd: [nodeId: string];
  connectStart: [event: MouseEvent, nodeId: string, handleType: 'source' | 'target'];
  contextMenu: [event: MouseEvent, nodeId: string];
  viewImage: [node: CanvasNodeData];
  /** 双击空媒体节点：请求上传文件填充该节点 */
  uploadInto: [nodeId: string];
}>();

const store = useCanvasStore();
const SELECTION_BLUE = '#2f80ff';

const hovered = ref(false);
const isEditingTitle = ref(false);
const titleDraft = ref(props.node.title || '');
const titleInputRef = ref<HTMLInputElement | null>(null);

const isGroup = computed(() => props.node.type === CanvasNodeType.Group);
const hasImageContent = computed(() => props.node.type === CanvasNodeType.Image && Boolean(props.node.metadata?.content));
const hasVideoContent = computed(() => props.node.type === CanvasNodeType.Video && Boolean(props.node.metadata?.content));
const hasAudioContent = computed(() => props.node.type === CanvasNodeType.Audio && Boolean(props.node.metadata?.content));
const isActive = computed(() => props.isConnectionTarget || props.isSelected || props.isFocusRelated);

watch(
  () => props.node.title,
  (title) => {
    titleDraft.value = title || '';
  },
);

watch(isEditingTitle, async (editing) => {
  if (!editing) return;
  await nextTick();
  titleInputRef.value?.focus();
  titleInputRef.value?.select();
});

function finishTitleEditing() {
  const title = titleDraft.value.trim() || props.node.title || '未命名';
  titleDraft.value = title;
  isEditingTitle.value = false;
  if (title !== props.node.title) store.updateNode(props.node.id, (node) => ({ ...node, title }));
}

// 标题编辑时点击外部结束
function handleOutsidePointerDown(event: PointerEvent) {
  if (!isEditingTitle.value) return;
  const target = event.target;
  if (target instanceof Node && titleInputRef.value?.contains(target)) return;
  finishTitleEditing();
}

watch(isEditingTitle, (editing) => {
  if (editing) window.addEventListener('pointerdown', handleOutsidePointerDown, true);
  else window.removeEventListener('pointerdown', handleOutsidePointerDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleOutsidePointerDown, true);
});

// ── 四角 resize（逻辑在 composable） ──────────────────────────
const { handleResizeMouseDown } = useNodeResize();

const resizeCorners: { corner: ResizeCorner; class: string }[] = [
  { corner: 'top-left', class: '-left-[14px] -top-[14px] cursor-nwse-resize' },
  { corner: 'top-right', class: '-right-[14px] -top-[14px] cursor-nesw-resize' },
  { corner: 'bottom-left', class: '-bottom-[14px] -left-[14px] cursor-nesw-resize' },
  { corner: 'bottom-right', class: '-bottom-[14px] -right-[14px] cursor-nwse-resize' },
];

// ── 样式计算 ──────────────────────────────────────────────────
const cardStyle = computed(() => {
  const transparent = hasImageContent.value || hasVideoContent.value;
  let borderColor: string;
  if (isGroup.value) {
    borderColor = props.isGroupDropTarget || isActive.value ? SELECTION_BLUE : 'var(--border)';
  } else if (hasImageContent.value) {
    borderColor = isActive.value ? SELECTION_BLUE : props.isRelated ? 'var(--muted)' : 'transparent';
  } else if (isActive.value) {
    borderColor = SELECTION_BLUE;
  } else if (props.isRelated) {
    borderColor = 'var(--muted)';
  } else {
    borderColor = transparent ? 'transparent' : 'var(--border)';
  }
  const boxShadow = props.isGroupDropTarget
    ? `0 0 0 2px ${SELECTION_BLUE}66, inset 0 0 0 999px ${SELECTION_BLUE}10`
    : isActive.value
      ? `0 0 0 1px ${SELECTION_BLUE}55`
      : props.isRelated
        ? '0 0 0 1px var(--muted), 0 18px 48px rgba(0,0,0,.14)'
        : undefined;
  return {
    background: isGroup.value ? 'rgb(from var(--surface) r g b / 0.4)' : transparent ? 'transparent' : 'var(--surface)',
    borderColor,
    borderStyle: isGroup.value ? 'dashed' : 'solid',
    boxShadow,
  };
});

const contentType = computed(() => {
  if (props.node.metadata?.status === 'loading') return 'loading';
  if (props.node.metadata?.status === 'error') return 'error';
  switch (props.node.type) {
    case CanvasNodeType.Text:
      return 'text';
    case CanvasNodeType.Image:
      return 'image';
    case CanvasNodeType.Config:
      return 'config';
    case CanvasNodeType.Video:
      return 'video';
    case CanvasNodeType.Audio:
      return 'audio';
    case CanvasNodeType.Group:
      return 'group';
    default:
      return 'unknown';
  }
});

const isEmptyMediaNode = computed(
  () =>
    (props.node.type === CanvasNodeType.Image ||
      props.node.type === CanvasNodeType.Video ||
      props.node.type === CanvasNodeType.Audio) &&
    !props.node.metadata?.content &&
    props.node.metadata?.status !== 'loading',
);

function handleDoubleClick(event: MouseEvent) {
  if (props.node.type === CanvasNodeType.Image && hasImageContent.value) {
    event.stopPropagation();
    emit('viewImage', props.node);
    return;
  }
  if (isEmptyMediaNode.value) {
    event.stopPropagation();
    emit('uploadInto', props.node.id);
  }
}

function formatBytes(bytes: number) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

const imageInfo = computed(() => {
  const width = Math.round(props.node.metadata?.naturalWidth || props.node.width);
  const height = Math.round(props.node.metadata?.naturalHeight || props.node.height);
  const size = formatBytes(props.node.metadata?.bytes || 0);
  return `${width} x ${height}${size ? ` · ${size}` : ''}`;
});
</script>

<template>
  <div
    :data-node-id="node.id"
    class="node-element absolute flex select-none flex-col"
    :class="[isGroup ? 'z-[5]' : isSelected ? 'z-50' : 'z-10']"
    :style="{
      transform: `translate(${node.position.x}px, ${node.position.y}px)`,
      width: `${node.width}px`,
      height: `${node.height}px`,
      transition: 'box-shadow 200ms ease',
      contain: 'layout style',
    }"
    @mouseenter="
      hovered = true;
      emit('hoverStart', node.id);
    "
    @mouseleave="
      hovered = false;
      emit('hoverEnd', node.id);
    "
    @mousedown.capture="(event) => emit('selectCapture', event, node.id)"
    @contextmenu="(event) => emit('contextMenu', event, node.id)"
  >
    <!-- 标题浮签：悬停/选中时显示，双击改名 -->
    <div
      v-if="isSelected || hovered || isEditingTitle"
      class="absolute left-3 top-[-28px] z-[65] max-w-[calc(100%-24px)]"
      @mousedown.stop
      @pointerdown.stop
    >
      <input
        v-if="isEditingTitle"
        ref="titleInputRef"
        v-model="titleDraft"
        maxlength="64"
        class="h-6 max-w-full border-0 border-b border-dashed border-border bg-transparent px-0 text-left text-xs font-medium text-fg outline-none"
        @blur="finishTitleEditing"
        @keydown.enter="finishTitleEditing"
        @keydown.esc="
          titleDraft = node.title || '';
          isEditingTitle = false;
        "
      >
      <button
        v-else
        type="button"
        class="block max-w-full truncate border-b border-dashed border-transparent px-0 py-0.5 text-left text-xs font-medium text-fg opacity-75 transition hover:border-current hover:opacity-100"
        title="双击重命名"
        @dblclick.stop="isEditingTitle = true"
      >
        {{ node.title || '未命名' }}
      </button>
    </div>

    <!-- 卡片主体 -->
    <div
      class="relative h-full w-full overflow-visible rounded-3xl border-2"
      :style="cardStyle"
      @mousedown="(event) => emit('mouseDown', event, node.id)"
      @dblclick="handleDoubleClick"
    >
      <div class="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit]">
        <!-- loading / error 状态层优先 -->
        <div
          v-if="contentType === 'loading'"
          class="flex h-full w-full flex-col items-center justify-center gap-3 text-fg"
        >
          <div class="size-10 animate-spin rounded-full border-2 border-border border-t-accent" />
          <span class="text-[10px] tracking-[0.2em] text-muted">生成中</span>
        </div>
        <div
          v-else-if="contentType === 'error'"
          class="flex max-w-[260px] flex-col items-center gap-3 px-5 text-center"
        >
          <div class="text-xs leading-5 text-danger">
            {{ node.metadata?.errorDetails || '生成失败' }}
          </div>
        </div>
        <NodeTextContent
          v-else-if="contentType === 'text'"
          :node="node"
          :edit-request-nonce="editRequestNonce"
        />
        <NodeImageContent
          v-else-if="contentType === 'image'"
          :node="node"
        />
        <NodeConfigContent
          v-else-if="contentType === 'config'"
          :node="node"
        />
        <NodeVideoContent
          v-else-if="contentType === 'video'"
          :node="node"
        />
        <NodeAudioContent
          v-else-if="contentType === 'audio'"
          :node="node"
        />
        <NodeGroupContent
          v-else-if="contentType === 'group'"
          :child-count="groupChildCount"
        />
        <div
          v-else
          class="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted"
        >
          <AppIcon
            name="alert-circle"
            :size="24"
            class="opacity-40"
          />
          <span class="text-sm">未知节点类型</span>
          <span class="text-[11px] opacity-70">{{ node.type }}</span>
        </div>
      </div>

      <!-- 图片信息条 -->
      <div
        v-if="showImageInfo && hasImageContent"
        class="pointer-events-none absolute bottom-3 right-3 z-40 max-w-[calc(100%-24px)]"
      >
        <span class="max-w-full truncate rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium leading-none text-white backdrop-blur-sm">
          {{ imageInfo }}
        </span>
      </div>

      <!-- 底部渐变（无内容节点） -->
      <div
        v-if="!isGroup && !hasImageContent && !hasVideoContent && !hasAudioContent"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bg/40 to-transparent"
      />

      <!-- 四角 resize 手柄 -->
      <div
        v-for="item in resizeCorners"
        :key="item.corner"
        class="absolute z-50 size-7"
        :class="item.class"
        @mousedown="(event) => handleResizeMouseDown(event, node, item.corner)"
      />
    </div>

    <!-- 左连接点（target） -->
    <div
      v-if="!isGroup"
      class="absolute top-1/2 -left-6 z-30 flex size-12 -translate-y-1/2 cursor-crosshair items-center justify-center transition-opacity duration-150"
      :class="hovered || isSelected || isConnecting ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'"
      @mousedown="(event) => emit('connectStart', event, node.id, 'target')"
    >
      <div class="size-3 rounded-full border-2 border-muted bg-surface transition-all hover:scale-125" />
    </div>
    <!-- 右连接点（source，config 节点无） -->
    <div
      v-if="!isGroup && node.type !== CanvasNodeType.Config"
      class="absolute top-1/2 -right-6 z-30 flex size-12 -translate-y-1/2 cursor-crosshair items-center justify-center transition-opacity duration-150"
      :class="hovered || isSelected || isConnecting ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'"
      @mousedown="(event) => emit('connectStart', event, node.id, 'source')"
    >
      <div class="size-3 rounded-full border-2 border-muted bg-surface transition-all hover:scale-125" />
    </div>
  </div>
</template>
