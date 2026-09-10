<script setup lang="ts">
// 参考图双来源：本地上传（mediaApi.upload）+ 素材库选取（assetsApi.list image）。
// 一律先落媒体库拿 mediaId，v-model 存 MediaFileView[]，生成时取 id 经 referenceMediaIds 传入。
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { mediaApi, mediaUrl } from '../../../lib/media-api'
import { assetsApi } from '../../../lib/assets-api'
import { AssetKind } from '../../../types/asset'
import type { MediaFileView } from '../../../types/media'
import AppIcon from '../../../components/AppIcon.vue'

// 已选参考媒体（父存 MediaFileView[]，生成时 .map(m => m.id)）
// compact：composer 底栏自己放「参考 / 素材库」，这里只渲染已选缩略图 + 隐藏 file input。
const props = withDefaults(defineProps<{ compact?: boolean; allowAudio?: boolean; firstLast?: boolean }>(), { compact: false, allowAudio: false, firstLast: false })
const accept = computed(() => props.allowAudio ? 'image/*,audio/*' : 'image/*')
function referenceLabel(m: MediaFileView) {
  if (m.kind === 'audio') return '音频'
  const index = model.value.filter((item) => item.kind === 'image').findIndex((item) => item.id === m.id)
  return props.firstLast ? (index === 0 ? '首帧' : index === 1 ? '尾帧' : '多余图片') : ''
}
const model = defineModel<MediaFileView[]>({ default: () => [] })

const uploading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement>()
const showAssetPicker = ref(false)

function pickFile() {
  fileInput.value?.click()
}
function openLibrary() {
  showAssetPicker.value = true
}
defineExpose({ pickFile, openLibrary, uploading })

function addMedia(m: MediaFileView) {
  if (!model.value.some((x) => x.id === m.id)) model.value = [...model.value, m]
}
function removeMedia(id: string) {
  model.value = model.value.filter((x) => x.id !== id)
}

async function uploadFiles(files: File[]) {
  const images = files.filter((f) => f.type.startsWith('image/') || (props.allowAudio && f.type.startsWith('audio/')))
  if (!images.length) return
  uploadError.value = ''
  uploading.value = true
  try {
    for (const file of images) {
      const media = await mediaApi.upload(file)
      addMedia(media)
    }
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : '上传失败'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function onFilePick(e: Event) {
  const list = (e.target as HTMLInputElement).files
  if (!list?.length) return
  await uploadFiles([...list])
}

function onDrop(e: DragEvent) {
  const list = e.dataTransfer?.files
  if (list?.length) void uploadFiles([...list])
}

// 素材库图片素材（选取来源）
const { data: assetData, isFetching } = useQuery({
  queryKey: ['studio-reference-assets'],
  queryFn: () => assetsApi.list({ kind: AssetKind.Image, limit: 50 }),
  enabled: showAssetPicker,
})
function pickAsset(media: MediaFileView | null) {
  if (media) addMedia(media)
  showAssetPicker.value = false
}
</script>

<template>
  <div
    @dragover.prevent
    @drop.stop.prevent="onDrop"
  >
    <!-- 已选缩略图 -->
    <div
      v-if="model.length"
      class="mb-2 flex flex-wrap gap-2"
    >
      <div
        v-for="m in model"
        :key="m.id"
        class="relative h-12 w-12 overflow-hidden rounded-lg border border-border"
      >
        <span
          v-if="m.kind === 'audio'"
          class="flex h-full items-center justify-center text-xs"
        >音频</span>
        <img
          v-else
          :src="mediaUrl(m.url)"
          :alt="m.fileName"
          class="h-full w-full object-cover"
        >
        <span
          v-if="referenceLabel(m)"
          class="absolute bottom-0 inset-x-0 bg-bg/90 text-center text-[10px]"
        >{{ referenceLabel(m) }}</span>
        <button
          class="absolute top-0.5 right-0.5 grid h-5 w-5 place-items-center rounded-full bg-bg/80 text-fg hover:bg-danger/15 hover:text-danger"
          aria-label="移除"
          @click="removeMedia(m.id)"
        >
          <AppIcon
            name="trash-2"
            :size="11"
          />
        </button>
      </div>
    </div>
    <p
      v-if="compact && uploadError"
      class="od-error mb-2 px-3 text-xs"
    >
      {{ uploadError }}
    </p>

    <!-- 双来源按钮（composer 工具条自己放入口，compact 只保留缩略图） -->
    <div
      v-if="!compact"
      class="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border p-3"
    >
      <p
        v-if="!compact"
        class="w-full text-xs text-muted"
      >
        添加参考素材，可拖入
      </p>
      <button
        class="od-btn od-btn-ghost text-xs"
        :disabled="uploading"
        @click="fileInput?.click()"
      >
        <AppIcon
          name="upload"
          :size="14"
        />
        {{ uploading ? '上传中…' : '添加参考素材' }}
      </button>
      <button
        class="od-btn od-btn-ghost text-xs"
        @click="showAssetPicker = true"
      >
        <AppIcon
          name="grid"
          :size="14"
        /> 素材库
      </button>
      <p
        v-if="uploadError"
        class="od-error w-full"
      >
        {{ uploadError }}
      </p>
    </div>

    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      multiple
      class="hidden"
      @change="onFilePick"
    >

    <!-- 素材库选取弹层 -->
    <div
      v-if="showAssetPicker"
      class="od-modal-overlay"
      @click.self="showAssetPicker = false"
    >
      <div class="od-panel flex max-h-[70vh] w-[min(560px,92vw)] flex-col p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-fg">
            从素材库选参考素材
          </h3>
          <button
            class="od-icon-btn"
            aria-label="关闭"
            @click="showAssetPicker = false"
          >
            <AppIcon
              name="x"
              :size="16"
            />
          </button>
        </div>
        <p
          v-if="allowAudio"
          class="mt-3 text-xs text-muted"
        >
          素材库提供图片；音频请通过上传按钮添加。
        </p>
        <div class="mt-4 min-h-0 flex-1 overflow-y-auto">
          <p
            v-if="isFetching"
            class="py-6 text-center text-sm text-muted"
          >
            加载中…
          </p>
          <p
            v-else-if="!assetData?.items.length"
            class="py-6 text-center text-sm text-muted"
          >
            素材库暂无此类素材
          </p>
          <div
            v-else
            class="grid grid-cols-4 gap-2"
          >
            <button
              v-for="a in assetData.items"
              :key="a.id"
              class="aspect-square overflow-hidden rounded-lg border border-border hover:border-accent"
              :title="a.title"
              @click="pickAsset(a.media)"
            >
              <img
                v-if="a.media?.kind === 'image'"
                :src="mediaUrl(a.media.url)"
                :alt="a.title"
                class="h-full w-full object-cover"
              >
              <span
                v-if="a.media?.kind === 'audio'"
                class="text-xs"
              >{{ a.title }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

