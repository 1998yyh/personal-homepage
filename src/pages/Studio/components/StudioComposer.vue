<script setup lang="ts">
// 生成台 prompt 条：空态居中 / 有选中时沉底。
// 生成钮放底栏右侧，不跟 textarea 并排——长 prompt 会把按钮挤到滚动条旁边。
import { computed, ref, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import OdSelect from '../../../components/ui/OdSelect.vue'
import AppIcon from '../../../components/AppIcon.vue'
import { useStudioStore } from '../../../stores/studio'
import type { StudioCapability } from '../../../lib/studio/types'
import {
  AUDIO_FORMATS,
  AUDIO_FORMAT_PRIMARY,
  AUDIO_SPEEDS,
  AUDIO_VOICES,
  CAP_LABEL,
  IMAGE_QUALITY_OPTIONS,
  IMAGE_SIZE_OPTIONS,
  IMAGE_SIZE_PRIMARY,
  VIDEO_QUALITIES,
  VIDEO_SECONDS_PRIMARY,
  VIDEO_SIZE_OPTIONS,
  VIDEO_SIZE_PRIMARY,
  ratioBox,
  videoSecondsLabel,
} from '../../../lib/studio/params'
import { mediaApi } from '../../../lib/media-api'
import type { ModelOption } from '../../../lib/studio/models'
import type { ModelCapability } from '../../../types/ai-generation'
import ReferencePicker from './ReferencePicker.vue'

const props = defineProps<{
  capability: ModelCapability
  modelOptions: ModelOption[]
  pendingCount: number
  docked: boolean
}>()

const store = useStudioStore()
const composer = computed(() => store.session(props.capability as StudioCapability).composer)

const emit = defineEmits<{
  generate: []
}>()

const showMoreSizes = ref(false)
const showMoreVideo = ref(false)
const showMoreAudio = ref(false)
const dragging = ref(false)
const refPicker = useTemplateRef('refPicker')

const imageSizes = computed(() =>
  showMoreSizes.value ? IMAGE_SIZE_OPTIONS : IMAGE_SIZE_PRIMARY,
)
const videoSeconds = computed(() => {
  const extra =
    composer.value.videoSeconds === '' || composer.value.videoSeconds === '-1'
  return showMoreVideo.value || extra
    ? (['', '-1', ...VIDEO_SECONDS_PRIMARY] as const)
    : VIDEO_SECONDS_PRIMARY
})
const videoSizes = computed(() => {
  const extra = !VIDEO_SIZE_PRIMARY.some((o) => o.value === composer.value.videoSize)
  return showMoreVideo.value || extra ? VIDEO_SIZE_OPTIONS : VIDEO_SIZE_PRIMARY
})
const audioFormats = computed(() =>
  showMoreAudio.value ? AUDIO_FORMATS : [AUDIO_FORMAT_PRIMARY],
)

function chipClass(on: boolean) {
  return on
    ? 'inline-flex cursor-pointer items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent-strong'
    : 'inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-fg/5 hover:text-fg'
}

function toolClass() {
  return 'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-fg/5 hover:text-fg'
}

function onKeydown(e: KeyboardEvent) {
  // Cmd/Ctrl+Enter 生成；单独 Enter 仍换行（prompt 经常多行）。
  if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return
  e.preventDefault()
  emit('generate')
}

const generateLabel = computed(() =>
  props.pendingCount > 0 ? '再生成一张' : `生成${CAP_LABEL[props.capability]}`,
)

// 空态引导：副标题、placeholder 示例、「试试」快捷示例（点选即填入并聚焦）。
const CAP_SUB: Record<ModelCapability, string> = {
  image: '描述画面主体、风格、光线和构图，越具体越好',
  video: '描述场景、镜头运动和想要的氛围，越具体越好',
  audio: '描述声音、语速和要朗读的内容',
  chat: '',
}
const CAP_PLACEHOLDER: Record<ModelCapability, string> = {
  image: '例如：黄昏下的江南水乡，水彩插画风，暖橙灯光，石桥边停着乌篷船…',
  video: '例如：城市从黄昏入夜的车流延时，光线拉丝，电影感调色…',
  audio: '例如：用温暖沉稳的女声朗读一段睡前故事，语速放慢…',
  chat: '输入内容…',
}
const EXAMPLE_PROMPTS: Record<ModelCapability, { label: string; text: string }[]> = {
  image: [
    { label: '水彩小镇', text: '黄昏下的江南水乡小镇，水彩插画风格，暖橙色灯光从窗户透出，石桥边停着一艘乌篷船，画面柔和留白' },
    { label: '城市海报', text: '上海外滩夜景城市海报，赛博朋克霓虹色调，高楼倒影在江面，顶部留白用于排版标题' },
    { label: '产品渲染', text: '一副白色无线耳机悬浮在浅灰背景中，柔和摄影棚布光，产品渲染风格，45 度俯角，材质细腻' },
  ],
  video: [
    { label: '延时摄影', text: '城市从黄昏到夜晚的车流延时摄影，光线拉丝，电影感调色，固定机位' },
    { label: '慢动作特写', text: '一只翠鸟扎进水面捕鱼的慢动作特写，水珠飞溅，自然纪录片风格，浅景深' },
  ],
  audio: [
    { label: '播客开场', text: '用温暖沉稳的声音朗读：欢迎收听本期节目，今天我们来聊聊人工智能的边界。' },
    { label: '睡前故事', text: '用轻柔舒缓的声音讲一个关于月亮和灯塔的睡前小故事，语速放慢，结尾渐弱。' },
  ],
  chat: [],
}

const promptInput = useTemplateRef('promptInput')
function useExample(text: string) {
  composer.value.prompt = text
  promptInput.value?.focus()
}

async function onDrop(e: DragEvent) {
  dragging.value = false
  if (props.capability === 'audio') return
  const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'))
  for (const file of files) {
    try {
      const media = await mediaApi.upload(file)
      store.addReference(props.capability as StudioCapability, media)
    } catch {
      composer.value.formError = '参考图上传失败'
    }
  }
}
</script>

<template>
  <div
    class="composer"
    :class="{ 'is-docked': docked, 'is-drop': dragging }"
    @dragover.prevent="capability !== 'audio' && (dragging = true)"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <div
      v-if="!docked"
      class="composer-hero"
    >
      <h2 class="composer-title">
        描述你想要的{{ CAP_LABEL[capability] }}
      </h2>
      <p
        v-if="CAP_SUB[capability]"
        class="composer-sub"
      >
        {{ CAP_SUB[capability] }}
      </p>
    </div>

    <div class="composer-card">
      <ReferencePicker
        v-if="capability !== 'audio'"
        ref="refPicker"
        v-model="composer.referenceMedia"
        compact
        :class="composer.referenceMedia.length ? 'px-3 pt-3' : 'hidden'"
      />

      <textarea
        ref="promptInput"
        v-model="composer.prompt"
        class="composer-prompt"
        :placeholder="CAP_PLACEHOLDER[capability]"
        @keydown="onKeydown"
      />

      <p
        v-if="composer.formError"
        class="od-error composer-error"
      >
        {{ composer.formError }}
      </p>

      <div class="composer-bar">
        <div class="composer-params">
          <template v-if="capability === 'image'">
            <div class="composer-group">
              <button
                v-for="opt in imageSizes"
                :key="opt.value"
                type="button"
                :class="chipClass(composer.imageSize === opt.value)"
                :title="opt.hint"
                @click="composer.imageSize = opt.value"
              >
                <span
                  class="inline-block rounded-[2px] border border-current opacity-70"
                  :style="{
                    width: `${ratioBox(opt.value).w}px`,
                    height: `${ratioBox(opt.value).h}px`,
                  }"
                />
                {{ opt.label }}
              </button>
              <button
                type="button"
                :class="toolClass()"
                @click="showMoreSizes = !showMoreSizes"
              >
                {{ showMoreSizes ? '收起' : '更多' }}
              </button>
            </div>
            <div class="composer-group">
              <button
                v-for="opt in IMAGE_QUALITY_OPTIONS"
                :key="opt.value"
                type="button"
                :class="chipClass(composer.imageQuality === opt.value)"
                @click="composer.imageQuality = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </template>

          <template v-else-if="capability === 'video'">
            <div class="composer-group">
              <button
                v-for="sec in videoSeconds"
                :key="sec || 'default'"
                type="button"
                :class="chipClass(composer.videoSeconds === sec)"
                @click="composer.videoSeconds = sec"
              >
                {{ videoSecondsLabel(sec) }}
              </button>
            </div>
            <div class="composer-group">
              <button
                v-for="opt in videoSizes"
                :key="opt.value"
                type="button"
                :class="chipClass(composer.videoSize === opt.value)"
                @click="composer.videoSize = opt.value"
              >
                <span
                  class="inline-block rounded-[2px] border border-current opacity-70"
                  :style="{
                    width: `${ratioBox(opt.value).w}px`,
                    height: `${ratioBox(opt.value).h}px`,
                  }"
                />
                {{ opt.label }}
              </button>
            </div>
            <div class="composer-group">
              <button
                v-for="q in VIDEO_QUALITIES"
                :key="q"
                type="button"
                :class="chipClass(composer.videoQuality === q)"
                @click="composer.videoQuality = q"
              >
                {{ q }}
              </button>
              <button
                type="button"
                :class="toolClass()"
                @click="showMoreVideo = !showMoreVideo"
              >
                {{ showMoreVideo ? '收起' : '更多' }}
              </button>
            </div>
          </template>

          <template v-else-if="capability === 'audio'">
            <div class="composer-group">
              <button
                v-for="v in AUDIO_VOICES"
                :key="v"
                type="button"
                :class="chipClass(composer.audioVoice === v)"
                @click="composer.audioVoice = v"
              >
                {{ v }}
              </button>
            </div>
            <div class="composer-group">
              <button
                v-for="f in audioFormats"
                :key="f"
                type="button"
                :class="chipClass(composer.audioFormat === f)"
                @click="composer.audioFormat = f"
              >
                {{ f }}
              </button>
              <button
                type="button"
                :class="toolClass()"
                @click="showMoreAudio = !showMoreAudio"
              >
                {{ showMoreAudio ? '收起' : '格式' }}
              </button>
            </div>
            <div class="composer-group">
              <button
                v-for="sp in AUDIO_SPEEDS"
                :key="sp"
                type="button"
                :class="chipClass(composer.audioSpeed === sp)"
                @click="composer.audioSpeed = sp"
              >
                {{ sp }}x
              </button>
            </div>
          </template>
        </div>

        <div class="composer-actions">
          <template v-if="capability !== 'audio'">
            <button
              type="button"
              class="composer-icon-btn"
              title="上传参考图"
              aria-label="上传参考图"
              @click="refPicker?.pickFile()"
            >
              <AppIcon
                name="upload"
                :size="14"
              />
            </button>
            <button
              type="button"
              class="composer-icon-btn"
              title="从素材库选参考图"
              aria-label="从素材库选参考图"
              @click="refPicker?.openLibrary()"
            >
              <AppIcon
                name="grid"
                :size="14"
              />
            </button>
          </template>
          <div class="composer-model">
            <OdSelect
              v-model="composer.modelRef"
              compact
              :options="modelOptions"
              placeholder="选择模型"
            />
          </div>
          <button
            class="od-btn od-btn-primary composer-go"
            :disabled="!modelOptions.length"
            title="⌘ / Ctrl + Enter"
            @click="emit('generate')"
          >
            <AppIcon
              name="sparkles"
              :size="15"
            />
            {{ generateLabel }}
          </button>
        </div>
      </div>

      <p
        v-if="!modelOptions.length"
        class="composer-hint"
      >
        还没有可用的{{ CAP_LABEL[capability] }}模型，请先到
        <RouterLink
          to="/channels"
          class="text-accent hover:underline"
        >
          渠道
        </RouterLink>
        启用一个。
      </p>
    </div>

    <div
      v-if="!docked && EXAMPLE_PROMPTS[capability].length"
      class="composer-examples"
    >
      <span class="composer-examples-label">试试</span>
      <button
        v-for="ex in EXAMPLE_PROMPTS[capability]"
        :key="ex.label"
        type="button"
        class="composer-example"
        @click="useExample(ex.text)"
      >
        {{ ex.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.composer {
  width: 100%;
}
.composer:not(.is-docked) {
  max-width: 48rem;
  margin-inline: auto;
  padding: 2rem 1rem;
}
.composer.is-docked {
  border-top: 1px solid var(--border);
  background: color-mix(in oklch, var(--bg) 82%, transparent);
  padding: 0.75rem 1rem 0.85rem;
  backdrop-filter: blur(20px);
}
.composer-hero {
  margin: 0 0 1.75rem;
  text-align: center;
}
.composer-title {
  margin: 0 0 0.5rem;
  font-family: 'Söhne', 'Avenir Next', -apple-system, system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: clamp(22px, 3vw, 28px);
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--fg);
}
.composer-sub {
  margin: 0;
  font-size: 13.5px;
  color: var(--muted);
}
.composer-card {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
}
.composer-card:focus-within {
  border-color: var(--accent-strong);
  box-shadow:
    var(--shadow-card),
    0 0 0 3px color-mix(in oklch, var(--accent) 16%, transparent);
}
.composer.is-drop .composer-card {
  border-color: var(--accent);
  background: color-mix(in oklch, var(--accent) 8%, var(--surface));
}
.composer-prompt {
  display: block;
  width: 100%;
  min-height: 5.5rem;
  max-height: 13rem;
  resize: none;
  overflow-y: auto;
  padding: 14px 16px 10px;
  background: transparent;
  font-size: 14px;
  line-height: 1.65;
  color: var(--fg);
  outline: none;
  scrollbar-width: thin;
}
.composer.is-docked .composer-prompt {
  min-height: 3.5rem;
  max-height: 8.5rem;
  padding: 10px 14px 8px;
}
.composer-prompt::placeholder {
  color: var(--muted);
}
.composer-error {
  padding: 0 16px 8px;
}
.composer-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px 12px;
  padding: 8px 10px 10px;
  border-top: 1px solid color-mix(in oklch, var(--border) 85%, transparent);
}
.composer-params {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
  flex: 1 1 16rem;
}
.composer-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}
.composer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex: 0 0 auto;
  padding-left: 12px;
  border-left: 1px solid color-mix(in oklch, var(--border) 85%, transparent);
}
.composer-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--muted);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}
.composer-icon-btn:hover {
  background: color-mix(in oklch, var(--fg) 6%, transparent);
  color: var(--fg);
}
.composer-model {
  width: 10.5rem;
  flex-shrink: 0;
}
.composer-go {
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}
.composer-hint {
  margin: 0;
  padding: 8px 14px 10px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: var(--muted);
}
.composer-examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
}
.composer-examples-label {
  font-size: 12px;
  color: var(--muted);
}
.composer-example {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-size: 12.5px;
  color: var(--muted);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.composer-example:hover {
  background: var(--accent-soft);
  border-color: color-mix(in oklch, var(--accent) 35%, var(--border));
  color: var(--accent-strong);
}
@media (prefers-reduced-motion: reduce) {
  .composer-card,
  .composer-icon-btn,
  .composer-example {
    transition: none;
  }
}
</style>
