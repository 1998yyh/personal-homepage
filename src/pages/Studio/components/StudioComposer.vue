<script setup lang="ts">
// 生成台 prompt 条：空态居中 / 有选中时沉底。chips + 模型 + 参考 + Cmd/Ctrl+Enter。
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
  ratioBox,
  videoSecondsLabel,
} from '../../../lib/studio/params'
import { mediaApi } from '../../../lib/media-api'
import type { ModelOption } from '../../../lib/studio/models'
import type { ModelCapability } from '../../../types/ai-generation'
import ReferencePicker from './ReferencePicker.vue'
import PromptLibraryPicker from './PromptLibraryPicker.vue'

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

const showPromptPicker = ref(false)
const showMoreSizes = ref(false)
const showMoreVideo = ref(false)
const showMoreAudio = ref(false)
const dragging = ref(false)
const refPicker = useTemplateRef('refPicker')

const imageSizes = computed(() =>
  showMoreSizes.value ? IMAGE_SIZE_OPTIONS : IMAGE_SIZE_PRIMARY,
)
const videoSeconds = computed(() =>
  showMoreVideo.value ? (['', '-1', ...VIDEO_SECONDS_PRIMARY] as const) : VIDEO_SECONDS_PRIMARY,
)
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

function fillPrompt(text: string) {
  composer.value.prompt = text
  showPromptPicker.value = false
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
    class="w-full"
    :class="docked ? 'border-t border-border bg-bg/80 px-4 py-3 backdrop-blur-xl' : 'mx-auto max-w-2xl px-4 py-8'"
    :data-dragging="dragging ? '1' : undefined"
    @dragover.prevent="capability !== 'audio' && (dragging = true)"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <div
      v-if="!docked"
      class="mb-3 text-center"
    >
      <p class="text-sm text-muted">
        描述你想要的{{ CAP_LABEL[capability] }}
      </p>
    </div>

    <div
      class="overflow-hidden rounded-2xl border transition"
      :class="dragging ? 'border-accent bg-accent-soft/30' : 'border-border bg-surface'"
    >
      <ReferencePicker
        v-if="capability !== 'audio'"
        ref="refPicker"
        v-model="composer.referenceMedia"
        compact
        :class="composer.referenceMedia.length ? 'px-3 pt-3' : 'hidden'"
      />

      <div class="flex items-end gap-3 px-3 py-2.5">
        <textarea
          v-model="composer.prompt"
          class="min-h-[64px] flex-1 resize-y bg-transparent text-sm leading-relaxed text-fg outline-none placeholder:text-muted"
          :placeholder="`描述你想要的${CAP_LABEL[capability]}，越具体越好…`"
          @keydown="onKeydown"
        />
        <button
          class="od-btn od-btn-primary shrink-0 !px-4 !py-2 text-[13px]"
          @click="emit('generate')"
        >
          <AppIcon
            name="sparkles"
            :size="15"
          />
          {{ generateLabel }}
        </button>
      </div>

      <p
        v-if="composer.formError"
        class="od-error px-3 pb-2"
      >
        {{ composer.formError }}
      </p>
      <p
        v-if="!modelOptions.length"
        class="px-3 pb-2 text-xs text-muted"
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

      <div class="flex flex-wrap items-center gap-0.5 border-t border-border/80 px-2 py-1.5">
        <template v-if="capability === 'image'">
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
              :style="{ width: `${ratioBox(opt.value).w}px`, height: `${ratioBox(opt.value).h}px` }"
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
          <span class="mx-1 h-3.5 w-px bg-border" />
          <button
            v-for="opt in IMAGE_QUALITY_OPTIONS"
            :key="opt.value"
            type="button"
            :class="chipClass(composer.imageQuality === opt.value)"
            @click="composer.imageQuality = opt.value"
          >
            {{ opt.label }}
          </button>
        </template>

        <template v-else-if="capability === 'video'">
          <button
            v-for="sec in videoSeconds"
            :key="sec || 'default'"
            type="button"
            :class="chipClass(composer.videoSeconds === sec)"
            @click="composer.videoSeconds = sec"
          >
            {{ videoSecondsLabel(sec) }}
          </button>
          <button
            type="button"
            :class="toolClass()"
            @click="showMoreVideo = !showMoreVideo"
          >
            {{ showMoreVideo ? '收起' : '更多' }}
          </button>
          <span class="mx-1 h-3.5 w-px bg-border" />
          <button
            v-for="opt in VIDEO_SIZE_OPTIONS"
            :key="opt.value"
            type="button"
            :class="chipClass(composer.videoSize === opt.value)"
            @click="composer.videoSize = opt.value"
          >
            <span
              class="inline-block rounded-[2px] border border-current opacity-70"
              :style="{ width: `${ratioBox(opt.value).w}px`, height: `${ratioBox(opt.value).h}px` }"
            />
            {{ opt.label }}
          </button>
          <span class="mx-1 h-3.5 w-px bg-border" />
          <button
            v-for="q in VIDEO_QUALITIES"
            :key="q"
            type="button"
            :class="chipClass(composer.videoQuality === q)"
            @click="composer.videoQuality = q"
          >
            {{ q }}
          </button>
        </template>

        <template v-else-if="capability === 'audio'">
          <button
            v-for="v in AUDIO_VOICES"
            :key="v"
            type="button"
            :class="chipClass(composer.audioVoice === v)"
            @click="composer.audioVoice = v"
          >
            {{ v }}
          </button>
          <span class="mx-1 h-3.5 w-px bg-border" />
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
          <span class="mx-1 h-3.5 w-px bg-border" />
          <button
            v-for="sp in AUDIO_SPEEDS"
            :key="sp"
            type="button"
            :class="chipClass(composer.audioSpeed === sp)"
            @click="composer.audioSpeed = sp"
          >
            {{ sp }}x
          </button>
        </template>

        <div class="ml-auto flex min-w-0 items-center gap-0.5">
          <template v-if="capability !== 'audio'">
            <button
              type="button"
              :class="toolClass()"
              @click="refPicker?.pickFile()"
            >
              <AppIcon
                name="upload"
                :size="12"
              />参考
            </button>
            <button
              type="button"
              :class="toolClass()"
              @click="refPicker?.openLibrary()"
            >
              <AppIcon
                name="grid"
                :size="12"
              />素材库
            </button>
          </template>
          <div class="w-[200px] shrink-0">
            <OdSelect
              v-model="composer.modelRef"
              compact
              :options="modelOptions"
              placeholder="选择模型"
            />
          </div>
          <button
            type="button"
            :class="toolClass()"
            @click="showPromptPicker = true"
          >
            <AppIcon
              name="sparkles"
              :size="12"
            />词库
          </button>
        </div>
      </div>
    </div>

    <PromptLibraryPicker
      v-if="showPromptPicker"
      @close="showPromptPicker = false"
      @select="fillPrompt"
    />
  </div>
</template>
