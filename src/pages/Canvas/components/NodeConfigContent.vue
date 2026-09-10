<script setup lang="ts">
// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/components/canvas/nodes/builtin-nodes.tsx 的 config 节点半 + project.tsx 的生成配置面板
// config 节点：生成配置 + 触发入口。
// 节点上显示配置摘要与「生成」按钮；点「配置」打开右侧抽屉（Teleport 到 body，
// 因为节点在 CSS transform 世界里，fixed 定位会失真）。
// 参考素材自动收集自连入的图片/视频/音频节点（metadata.mediaId），提示词可连文本节点拼入。
import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { CanvasGenerationMode, CanvasNodeData, CanvasNodeMetadata } from '../../../types/canvas';
import { videoRequirements } from '../../../lib/video-model-config';
import { channelsApi, toModelRef } from '../../../lib/channels-api';
import { useCanvasStore } from '../../../stores/canvas';
import { useNodeGeneration } from '../composables/useNodeGeneration';
import AppIcon from '../../../components/AppIcon.vue';
import OdSelect from '../../../components/ui/OdSelect.vue';

const props = defineProps<{ node: CanvasNodeData }>();

const store = useCanvasStore();
const { generating, runGeneration } = useNodeGeneration();
const drawerOpen = ref(false);

const MODE_OPTIONS: Array<{ value: CanvasGenerationMode; label: string }> = [
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
];

const IMAGE_SIZE_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: '1024x1024', label: '1024x1024' },
  { value: '1536x1024', label: '1536x1024' },
  { value: '1024x1536', label: '1024x1536' },
];
const IMAGE_QUALITY_OPTIONS = [
  { value: 'low', label: 'low' },
  { value: 'medium', label: 'medium' },
  { value: 'high', label: 'high' },
];
const IMAGE_BACKGROUNDS = [
  { value: '', label: '默认' },
  { value: 'transparent', label: '透明' },
  { value: 'opaque', label: '不透明' },
];
const VIDEO_SIZE_OPTIONS = ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'].map((s) => ({
  value: s,
  label: s === 'auto' ? '自动' : s,
}));
const VIDEO_SECONDS = [
  { value: '', label: '默认' },
  { value: '-1', label: '自动' },
  { value: '5', label: '5 秒' },
  { value: '8', label: '8 秒' },
  { value: '10', label: '10 秒' },
  { value: '15', label: '15 秒' },
];
const VIDEO_QUALITY_OPTIONS = ['480p', '720p', '1080p'].map((q) => ({ value: q, label: q }));
const AUDIO_VOICE_OPTIONS = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar'].map((v) => ({ value: v, label: v }));
const AUDIO_FORMAT_OPTIONS = ['mp3', 'wav', 'opus', 'aac', 'flac', 'pcm'].map((f) => ({ value: f, label: f }));
const COUNT_OPTIONS = [1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} 张` }));

const meta = computed(() => props.node.metadata || {});
const mode = computed<CanvasGenerationMode>(() => meta.value.generationMode || 'image');

const { data: channels } = useQuery({
  queryKey: ['ai-channels'],
  queryFn: () => channelsApi.list(),
});

/** 当前能力下的可选模型（modelRef = "channelId::modelName"） */
const modelOptions = computed(() =>
  (channels.value ?? [])
    .filter((c) => c.isActive)
    .flatMap((c) =>
      c.models
        .filter((m) => m.capability === mode.value)
        .map((m) => ({ value: toModelRef(c.id, m.name), videoConfig: m.videoConfig, label: `${c.name} / ${m.name}` })),
    ),
);

const videoConfig = computed(() => mode.value === 'video' ? modelOptions.value.find((o) => o.value === meta.value.model)?.videoConfig : undefined);
const requirements = computed(() => videoRequirements(videoConfig.value));
const videoSizes = computed(() => videoConfig.value ? VIDEO_SIZE_OPTIONS.filter((o) => ['auto', '16:9', '9:16', '1:1'].includes(o.value)) : VIDEO_SIZE_OPTIONS);
const videoSeconds = computed(() => {
  const config = videoConfig.value;
  if (config?.fixedSeconds) return [{ value: String(config.fixedSeconds), label: `${config.fixedSeconds} 秒` }];
  if (config) {
    const max = config.maxSeconds ?? 15;
    return [{ value: '', label: '默认' }, ...Array.from(new Set(['5', '8', '10', '15', String(max)])).filter((s) => Number(s) <= max).map((s) => ({ value: s, label: `${s} 秒` }))];
  }
  return VIDEO_SECONDS;
});
const videoQualities = computed(() => {
  const config = videoConfig.value;
  const values = config?.fixedResolution ? [config.fixedResolution] : config?.resolutions;
  return values ? values.map((q) => ({ value: q, label: q })) : VIDEO_QUALITY_OPTIONS;
});
watch(videoConfig, (config) => {
  if (!config) return;
  const next: Partial<CanvasNodeMetadata> = {};
  if (meta.value.size && !['auto', '16:9', '9:16', '1:1'].includes(meta.value.size)) next.size = 'auto';
  if (config.fixedSeconds) next.seconds = String(config.fixedSeconds);
  else if (Number(meta.value.seconds) > (config.maxSeconds ?? 15) || meta.value.seconds === '-1') next.seconds = String(Math.min(5, config.maxSeconds ?? 15));
  next.vquality = videoQualities.value.find((q) => q.value.toLowerCase() === meta.value.vquality?.toLowerCase())?.value ?? videoQualities.value[0]?.value ?? '';
  if (Object.keys(next).length) patch(next);
}, { immediate: true });
const frameLabels = computed(() => {
  if (videoConfig.value?.template !== 'first_last') return [];
  return store.connections.filter((c) => c.toNodeId === props.node.id).map((c) => store.nodes.find((n) => n.id === c.fromNodeId)).filter((n) => n?.type === 'image' && n.metadata?.mediaId).map((n, i) => `${i === 0 ? '首帧' : i === 1 ? '尾帧' : '多余图片'}：${n?.title || n?.id}`);
});
const modeLabel = computed(() => MODE_OPTIONS.find((m) => m.value === mode.value)?.label || '图片');
const modelLabel = computed(() => {
  const current = meta.value.model;
  if (!current) return '未选择模型';
  return modelOptions.value.find((o) => o.value === current)?.label || current.split('::')[1] || current;
});

/** 连入的参考素材数量（图片/视频/音频节点） */
const referenceCount = computed(
  () =>
    store.connections.filter((conn) => {
      if (conn.toNodeId !== props.node.id) return false;
      const source = store.nodes.find((n) => n.id === conn.fromNodeId);
      return Boolean(source?.metadata?.mediaId);
    }).length,
);

const isLoading = computed(() => generating.value || meta.value.status === 'loading');

function patch(patchValue: Partial<CanvasNodeMetadata>) {
  store.updateNodeMetadata(props.node.id, patchValue);
}

function switchMode(next: CanvasGenerationMode) {
  // 切换模式时清掉模型选择（能力不同，原选择多半不匹配）
  patch({ generationMode: next, model: undefined });
}

function handleGenerate() {
  void runGeneration(props.node.id);
}
</script>

<template>
  <div class="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
    <div class="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">
      <AppIcon
        name="sliders"
        :size="22"
      />
    </div>
    <div class="text-sm font-medium text-fg">
      {{ modeLabel }}生成
    </div>
    <div class="max-w-full truncate text-xs text-muted">
      {{ modelLabel }}
    </div>
    <div
      v-if="referenceCount"
      class="text-xs text-muted"
    >
      {{ referenceCount }} 个参考素材
    </div>
    <div class="mt-1 flex items-center gap-2">
      <button
        type="button"
        class="od-btn od-btn-primary !px-3.5 !py-1.5 text-xs"
        :disabled="isLoading"
        data-canvas-no-zoom
        @pointerdown.stop
        @mousedown.stop
        @click.stop="handleGenerate"
      >
        {{ isLoading ? '生成中…' : '生成' }}
      </button>
      <button
        type="button"
        class="od-btn od-btn-ghost !px-3.5 !py-1.5 text-xs"
        data-canvas-no-zoom
        @pointerdown.stop
        @mousedown.stop
        @click.stop="drawerOpen = true"
      >
        配置
      </button>
    </div>
  </div>

  <!-- 配置抽屉：Teleport 出 transform 世界 -->
  <Teleport to="body">
    <template v-if="drawerOpen">
      <div
        class="od-drawer-overlay"
        @click.self="drawerOpen = false"
      />
      <aside
        class="od-drawer"
        data-canvas-no-zoom
      >
        <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 class="font-display font-bold text-[17px] text-fg">
            {{ modeLabel }}生成配置
          </h2>
          <button
            class="od-icon-btn !w-9 !h-9"
            aria-label="关闭"
            @click="drawerOpen = false"
          >
            <AppIcon
              name="x"
              :size="16"
            />
          </button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <p
            v-if="requirements"
            class="text-xs text-muted"
          >
            {{ requirements }}。画布按连线添加顺序取图。
          </p>
          <p
            v-for="label in frameLabels"
            :key="label"
            class="text-xs text-muted"
          >
            {{ label }}
          </p>
          <div>
            <label class="od-label">生成方式</label>
            <div class="flex gap-2">
              <button
                v-for="opt in MODE_OPTIONS"
                :key="opt.value"
                type="button"
                class="od-btn flex-1 !py-1.5 text-sm"
                :class="mode === opt.value ? 'od-btn-primary' : 'od-btn-ghost'"
                @click="switchMode(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="od-label">提示词</label>
            <textarea
              :value="meta.prompt || ''"
              class="od-input resize-y min-h-[96px]"
              rows="4"
              placeholder="描述想要生成的内容；连入的文本节点会拼接到提示词后面"
              @input="patch({ prompt: ($event.target as HTMLTextAreaElement).value })"
            />
          </div>

          <div>
            <label class="od-label">模型</label>
            <OdSelect
              :model-value="meta.model"
              placeholder="请选择模型"
              :options="modelOptions"
              @update:model-value="(v) => patch({ model: v || undefined })"
            />
            <p
              v-if="!modelOptions.length"
              class="text-muted text-xs mt-1.5"
            >
              没有可用的{{ modeLabel }}模型，请先到「渠道」页配置
            </p>
          </div>

          <!-- 图片参数 -->
          <template v-if="mode === 'image'">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="od-label">尺寸</label>
                <OdSelect
                  :model-value="meta.size || 'auto'"
                  :options="IMAGE_SIZE_OPTIONS"
                  @update:model-value="(v) => patch({ size: v })"
                />
              </div>
              <div>
                <label class="od-label">质量</label>
                <OdSelect
                  :model-value="meta.quality || 'medium'"
                  :options="IMAGE_QUALITY_OPTIONS"
                  @update:model-value="(v) => patch({ quality: v })"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="od-label">背景</label>
                <OdSelect
                  :model-value="meta.background ?? ''"
                  :options="IMAGE_BACKGROUNDS"
                  @update:model-value="(v) => patch({ background: v || undefined })"
                />
              </div>
              <div>
                <label class="od-label">数量</label>
                <OdSelect
                  :model-value="String(meta.count || 1)"
                  :options="COUNT_OPTIONS"
                  @update:model-value="(v) => patch({ count: Number(v) })"
                />
              </div>
            </div>
          </template>

          <!-- 视频参数 -->
          <template v-else-if="mode === 'video'">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="od-label">时长</label>
                <OdSelect
                  :model-value="meta.seconds ?? ''"
                  :options="videoSeconds"
                  @update:model-value="(v) => patch({ seconds: v || undefined })"
                />
              </div>
              <div>
                <label class="od-label">比例</label>
                <OdSelect
                  :model-value="meta.size || 'auto'"
                  :options="videoSizes"
                  @update:model-value="(v) => patch({ size: v })"
                />
              </div>
            </div>
            <div>
              <label class="od-label">清晰度</label>
              <OdSelect
                :model-value="meta.vquality || '720p'"
                :options="videoQualities"
                :placeholder="videoQualities.length ? '选择清晰度' : '清晰度由模型决定'"
                :disabled="!videoQualities.length"
                @update:model-value="(v) => patch({ vquality: v })"
              />
            </div>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="accent-[var(--accent)]"
                :checked="meta.generateAudio !== 'false'"
                @change="patch({ generateAudio: ($event.target as HTMLInputElement).checked ? 'true' : 'false' })"
              >
              <span class="text-fg text-sm">生成配音（Seedance 有效）</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                class="accent-[var(--accent)]"
                :checked="meta.watermark === 'true'"
                @change="patch({ watermark: ($event.target as HTMLInputElement).checked ? 'true' : 'false' })"
              >
              <span class="text-fg text-sm">添加水印（Seedance 有效）</span>
            </label>
          </template>

          <!-- 音频参数 -->
          <template v-else>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="od-label">音色</label>
                <OdSelect
                  :model-value="meta.audioVoice || 'alloy'"
                  :options="AUDIO_VOICE_OPTIONS"
                  @update:model-value="(v) => patch({ audioVoice: v })"
                />
              </div>
              <div>
                <label class="od-label">格式</label>
                <OdSelect
                  :model-value="meta.audioFormat || 'mp3'"
                  :options="AUDIO_FORMAT_OPTIONS"
                  @update:model-value="(v) => patch({ audioFormat: v })"
                />
              </div>
            </div>
            <div>
              <label class="od-label">语速（0.25 - 4）</label>
              <input
                class="od-input"
                :value="meta.audioSpeed || '1'"
                placeholder="1"
                @input="patch({ audioSpeed: ($event.target as HTMLInputElement).value })"
              >
            </div>
            <div>
              <label class="od-label">附加指令（语气/情绪，模型支持时生效）</label>
              <textarea
                :value="meta.audioInstructions || ''"
                class="od-input resize-y"
                rows="2"
                @input="patch({ audioInstructions: ($event.target as HTMLTextAreaElement).value })"
              />
            </div>
          </template>

          <p class="text-muted text-xs">
            参考素材：把图片/视频/音频节点连到本节点即自动作为参考（当前 {{ referenceCount }} 个）。
            视频为异步任务，生成期间可继续编辑画布。
          </p>
        </div>

        <div class="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            class="od-btn od-btn-ghost flex-1"
            @click="drawerOpen = false"
          >
            关闭
          </button>
          <button
            type="button"
            class="od-btn od-btn-primary flex-1"
            :disabled="isLoading"
            @click="handleGenerate"
          >
            {{ isLoading ? '生成中…' : '开始生成' }}
          </button>
        </div>
      </aside>
    </template>
  </Teleport>
</template>
