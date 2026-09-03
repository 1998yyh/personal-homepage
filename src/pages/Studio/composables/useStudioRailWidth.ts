// 生成台左侧历史栏宽度：拖拽调节，限制范围，写入 localStorage（键名对齐 zhe-theme）。
// 列数变化时用 View Transitions 做缩略图位移（跟手拖宽不逐帧开过渡）。
import { nextTick, onBeforeUnmount, ref } from 'vue'

export const RAIL_WIDTH_MIN = 96
export const RAIL_WIDTH_MAX = 280
export const RAIL_WIDTH_DEFAULT = 96

const STORAGE_KEY = 'zhe-studio-rail-width'
const RAIL_PAD = 24
const THUMB = 64
const THUMB_GAP = 12
const VT_CLASS = 'studio-rail-vt'

function clamp(n: number): number {
  return Math.round(Math.min(RAIL_WIDTH_MAX, Math.max(RAIL_WIDTH_MIN, n)))
}

/** 当前栏宽能排几列固定 64px 缩略图（与 gap-3 / p-3 对齐） */
export function railColumnCount(width: number): number {
  const inner = Math.max(THUMB, width - RAIL_PAD)
  return Math.max(1, Math.floor((inner + THUMB_GAP) / (THUMB + THUMB_GAP)))
}

/** view-transition-name 必须是合法 CSS ident，taskId 里的非法字符换成下划线。 */
export function railItemVtName(key: string): string {
  return `studio-rail-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function readStored(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return RAIL_WIDTH_DEFAULT
    const n = Number(raw)
    return Number.isFinite(n) ? clamp(n) : RAIL_WIDTH_DEFAULT
  } catch {
    return RAIL_WIDTH_DEFAULT
  }
}

function writeStored(n: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(n))
  } catch {
    // 隐私模式：仅本次会话生效
  }
}

function canViewTransition(): boolean {
  return (
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useStudioRailWidth() {
  const width = ref(readStored())
  const dragging = ref(false)
  let startX = 0
  let startW = RAIL_WIDTH_DEFAULT
  let vtRunning = false

  function persist() {
    writeStored(clamp(width.value))
  }

  function setWidth(next: number) {
    const clamped = clamp(next)
    if (clamped === width.value) return

    // 拖拽跟手只改宽度；View Transition 只在 1↔2↔3 列变化时开一次，逐像素开会卡死。
    const colsChanged = railColumnCount(clamped) !== railColumnCount(width.value)
    if (!colsChanged || vtRunning || !canViewTransition()) {
      width.value = clamped
      return
    }

    vtRunning = true
    document.documentElement.classList.add(VT_CLASS)
    const vt = document.startViewTransition(async () => {
      width.value = clamped
      await nextTick() // 等栏宽刷进 DOM 再拍新快照，否则过渡从空布局起跳。
    })
    void vt.finished.finally(() => {
      vtRunning = false
      document.documentElement.classList.remove(VT_CLASS)
    })
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging.value) return
    setWidth(startW + (e.clientX - startX))
  }

  function stopDrag() {
    if (!dragging.value) return
    dragging.value = false
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopDrag)
    persist() // 松手再写 localStorage，避免拖动中狂刷存储。
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    dragging.value = true
    startX = e.clientX
    startW = width.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stopDrag)
  }

  function reset() {
    setWidth(RAIL_WIDTH_DEFAULT)
    persist()
  }

  onBeforeUnmount(() => {
    document.documentElement.classList.remove(VT_CLASS)
    stopDrag()
  })

  return { width, dragging, onPointerDown, reset }
}
