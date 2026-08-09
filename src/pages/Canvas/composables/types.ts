// 画布交互共享类型：编辑器页创建坐标换算函数后注入各交互 composable
import type { Position } from '../../../types/canvas';

export type CanvasScreenPoint = { x: number; y: number };

/** 屏幕坐标（clientX/clientY）→ 画布世界坐标 */
export type ScreenToCanvas = (clientX: number, clientY: number) => Position;

/** 当前视口中心的世界坐标（新建/粘贴节点落点） */
export type GetCanvasCenter = () => Position;
