// 与后端 media 模块（media_files 表 + MediaFileView）一一对应

export type MediaKind = 'image' | 'video' | 'audio' | 'file';
export type MediaSource = 'upload' | 'generation' | 'import';

export interface MediaFileView {
  id: string;
  userId: string;
  kind: MediaKind;
  fileName: string;
  /** 相对路径，形如 /uploads/media/<fileName>，用 mediaUrl() 拼绝对地址 */
  url: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  source: MediaSource;
  createdAt: string;
  updatedAt: string;
}
