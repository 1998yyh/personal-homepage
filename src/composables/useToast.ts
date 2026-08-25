// 全局轻提示（toast）：模块级响应式队列，App.vue 挂 AppToast 组件渲染
// 不用 Pinia——就一个队列数组，杀鸡不用牛刀
import { ref } from 'vue';

export type ToastType = 'error' | 'success';
export type ToastItem = { id: number; message: string; type: ToastType };

/** 默认停留时长：报错要让人看清，给 5s */
const TOAST_DURATION = 5000;

export const toasts = ref<ToastItem[]>([]);
let seq = 0;

export function dismissToast(id: number) {
  toasts.value = toasts.value.filter((item) => item.id !== id);
}

export function showToast(message: string, type: ToastType = 'error', duration = TOAST_DURATION) {
  const text = message.trim();
  if (!text) return;
  const id = (seq += 1);
  toasts.value = [...toasts.value, { id, message: text, type }];
  setTimeout(() => dismissToast(id), duration);
}
