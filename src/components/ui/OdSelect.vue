<script setup lang="ts">
// 全站首个第三方组件层：reka-ui（headless）Select 封装，样式全接 od-* 设计令牌、
// 随 data-theme 亮暗自动切换。收起态复用 .od-input 观感，
// 展开浮层是自绘的 —— 解决原生 <select> 系统弹层 CSS 不可控、视觉割裂的问题。
import { computed } from 'vue'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from 'reka-ui'
import AppIcon from '../AppIcon.vue'

const props = withDefaults(
  defineProps<{
    options: Array<{ value: string; label: string; description?: string }>
    placeholder?: string
    disabled?: boolean
    compact?: boolean
  }>(),
  { compact: false, disabled: false, placeholder: undefined },
)

// modelRef 字符串（modelValue 可空以支持未选态）
const model = defineModel<string>()

// reka-ui SelectItem 禁止空字符串；「默认 / 未选」这类 value:'' 在内部换成哨兵。
const EMPTY = '__od_empty__'
const inner = computed({
  get: () => (model.value === '' ? EMPTY : model.value),
  set: (v: string | number | null | undefined) => {
    if (v == null) {
      model.value = undefined
      return
    }
    const s = String(v)
    model.value = s === EMPTY ? '' : s
  },
})
const mappedOptions = computed(() =>
  props.options.map((o) => ({
    label: o.label,
    description: o.description,
    value: o.value === '' ? EMPTY : o.value,
  })),
)

defineOptions({ inheritAttrs: false })
</script>

<template>
  <SelectRoot
    v-model="inner"
    :disabled="disabled"
  >
    <SelectTrigger
      v-bind="$attrs"
      class="flex w-full items-center justify-between gap-2 text-left"
      :class="[
        compact
          ? 'h-8 rounded-lg border border-border bg-transparent px-2.5 text-xs text-fg'
          : 'od-input', // compact 给生成台底栏：避免 od-input 的大内边距把工具条撑高。
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ]"
    >
      <SelectValue
        class="min-w-0 truncate"
        :placeholder="placeholder ?? '请选择…'"
      />
      <SelectIcon class="shrink-0 text-muted">
        <AppIcon
          name="chevron-down"
          :size="compact ? 14 : 16"
        />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="6"
        class="od-select-content z-[60] max-h-[280px] min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface shadow-lift"
      >
        <SelectViewport class="max-h-[268px] overflow-y-auto p-1.5">
          <SelectItem
            v-for="opt in mappedOptions"
            :key="opt.value"
            :value="opt.value"
            class="od-select-item relative flex cursor-pointer items-center rounded-lg py-2 pr-8 pl-3 text-sm text-fg outline-none select-none data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-strong data-[state=checked]:font-semibold"
          >
            <div class="min-w-0">
              <SelectItemText>{{ opt.label }}</SelectItemText>
              <p
                v-if="opt.description"
                class="mt-1 whitespace-normal break-words text-xs leading-relaxed text-muted font-normal"
              >
                {{ opt.description }}
              </p>
            </div>
            <SelectItemIndicator class="absolute right-2 inline-flex items-center text-accent-strong">
              <AppIcon
                name="check"
                :size="15"
              />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
