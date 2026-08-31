<script setup lang="ts">
// 参考图双来源：本地上传（mediaApi.upload）+ 素材库选取（assetsApi.list image）。
// 一律先落媒体库拿 mediaId，v-model 存 MediaFileView[]，生成时取 id 经 referenceMediaIds 传入。
import { ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { mediaApi, mediaUrl } from '../../../lib/media-api'
import { assetsApi } from '../../../lib/assets-api'
import { AssetKind } from '../../../types/asset'
import type { MediaFileView } from '../../../types/media'
import AppIcon from '../../../components/AppIcon.vue'

// 已选参考媒体（父存 MediaFileView[]，生成时 .map(m => m.id)）
const model = defineModel<MediaFileView[]>({ default: () => [] })

const uploading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement>()
const showAssetPicker = ref(false)

function addMedia(m: MediaFileView) {
  if (!model.value.some((x) => x.id === m.id)) model.value = [...model.value, m]
}
function removeMedia(id: string) {
  model.value = model.value.filter((x) => x.id !== id)
}

async function onFilePick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  try {
    const media = await mediaApi.upload(file)
    addMedia(media)
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : '上传失败'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
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
  <div>
    <!-- 已选缩略图 -->
    <div
      v-if="model.length"
      class="mb-2 flex flex-wrap gap-2"
    >
      <div
        v-for="m in model"
        :key="m.id"
        class="relative h-16 w-16 overflow-hidden rounded-lg border border-border"
      >
        <img
          :src="mediaUrl(m.url)"
          :alt="m.fileName"
          class="h-full w-full object-cover"
        >
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

    <!-- 双来源按钮 -->
    <div class="rounded-xl border border-dashed border-border p-3 text-center">
      <p class="text-xs text-muted">
        图生图，先落媒体库再引用
      </p>
      <div class="mt-2 flex justify-center gap-2">
        <button
          class="od-btn od-btn-ghost text-xs"
          :disabled="uploading"
          @click="fileInput?.click()"
        >
          <AppIcon
            name="upload"
            :size="14"
          />
          {{ uploading ? '上传中…' : '上传' }}
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
      </div>
      <p
        v-if="uploadError"
        class="od-error mt-2"
      >
        {{ uploadError }}
      </p>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFilePick"
      >
    </div>

    <!-- 素材库选取弹层 -->
    <div
      v-if="showAssetPicker"
      class="od-modal-overlay"
      @click.self="showAssetPicker = false"
    >
      <div class="od-panel flex max-h-[70vh] w-[min(560px,92vw)] flex-col p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-fg">
            从素材库选参考图
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
            素材库暂无图片素材
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
                v-if="a.media"
                :src="mediaUrl(a.media.url)"
                :alt="a.title"
                class="h-full w-full object-cover"
              >
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

