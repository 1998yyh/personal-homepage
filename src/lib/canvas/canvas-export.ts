// Adapted from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/lib/canvas/canvas-export.ts
// 改造点：源项目媒体存浏览器 IndexedDB（storageKey），本项目媒体在服务端（URL），
// 导出时改为 fetch 媒体 URL 取 Blob；i18n 文案 → 中文常量；saveAs → downloadBlob。
import { mediaUrl } from '../media-api';
import { createZip, downloadBlob } from '../zip';
import { CanvasNodeType, type CanvasDocument, type CanvasNodeData } from '../../types/canvas';

const DEFAULT_PROJECT_NAME = '画布导出';
const DEFAULT_NODES_NAME = '节点导出';
const FALLBACK_ITEM_NAME = '内容';

type CanvasExportAsset = {
  /** 节点 metadata.content 的原始 URL */
  url: string;
  /** zip 内路径 */
  path: string;
  mimeType: string;
  bytes: number;
};

type CanvasExportFile = {
  app: 'tuanzi-canvas';
  version: 1;
  exportedAt: string;
  projects: { name: string; document: CanvasDocument; files: CanvasExportAsset[] }[];
};

/** 拉取媒体内容，失败时跳过该文件（不阻断整体导出） */
async function fetchMediaBlob(url: string) {
  try {
    const response = await fetch(mediaUrl(url));
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

/** 收集文档中所有节点引用的媒体 URL（metadata.content 为 http/相对路径的节点） */
function collectMediaUrls(document: CanvasDocument) {
  const urls = new Set<string>();
  for (const node of document.nodes) {
    const content = node.metadata?.content;
    if (content && !content.startsWith('data:') && (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio)) {
      urls.add(content);
    }
  }
  return [...urls];
}

/** 导出整个画布项目：document JSON + 引用的媒体文件打包 zip */
export async function exportCanvasProject(name: string, document: CanvasDocument) {
  const zipFiles: { name: string; data: BlobPart }[] = [];
  const files: CanvasExportAsset[] = [];

  await Promise.all(
    collectMediaUrls(document).map(async (url, index) => {
      const blob = await fetchMediaBlob(url);
      if (!blob) return;
      const path = `files/${String(index + 1).padStart(3, '0')}-${safeFileName(fileNameFromUrl(url)) || `media-${index + 1}`}.${fileExtension(blob.type)}`;
      files.push({ url, path, mimeType: blob.type || 'application/octet-stream', bytes: blob.size });
      zipFiles.push({ name: path, data: blob });
    }),
  );

  const data: CanvasExportFile = {
    app: 'tuanzi-canvas',
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: [{ name, document, files }],
  };
  const zip = await createZip([{ name: 'project.json', data: JSON.stringify(data, null, 2) }, ...zipFiles]);
  downloadBlob(zip, `${safeFileName(name) || DEFAULT_PROJECT_NAME}.zip`);
}

/** 导出选中节点：媒体节点导文件、文本节点导 txt、其余导 JSON */
export async function exportCanvasNodes(nodes: CanvasNodeData[]) {
  const zipFiles: { name: string; data: BlobPart }[] = [];
  const used = new Set<string>();
  const uniqueName = (base: string, ext: string) => {
    const safe = safeFileName(base) || FALLBACK_ITEM_NAME;
    let name = `${safe}.${ext}`;
    for (let i = 1; used.has(name); i += 1) name = `${safe}-${i}.${ext}`;
    used.add(name);
    return name;
  };

  await Promise.all(
    nodes.map(async (node) => {
      const title = node.title || node.type;
      const content = node.metadata?.content || '';
      if (content && (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio)) {
        const blob = await fetchMediaBlob(content);
        if (blob) return void zipFiles.push({ name: uniqueName(title, fileExtension(blob.type)), data: blob });
      }
      if (node.type === CanvasNodeType.Text) {
        return void zipFiles.push({ name: uniqueName(title, 'txt'), data: node.metadata?.content || node.metadata?.prompt || '' });
      }
      zipFiles.push({ name: uniqueName(title, 'json'), data: JSON.stringify(node, null, 2) });
    }),
  );

  const zip = await createZip(zipFiles);
  downloadBlob(zip, `${DEFAULT_NODES_NAME}.zip`);
}

function fileNameFromUrl(url: string) {
  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url;
    return pathname.split('/').filter(Boolean).pop() || '';
  } catch {
    return '';
  }
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_');
}

function fileExtension(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'bin';
}
