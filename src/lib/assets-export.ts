// 素材库 ZIP 导入/导出（格式参考 infinite-canvas canvas-export，AGPL-3.0. See NOTICE.）
// 导出：assets.json 清单 + 文本存 txt / 媒体拉取二进制落 zip；导入：按清单或文件类型还原素材。
import { assetsApi } from './assets-api';
import { mediaApi, mediaUrl } from './media-api';
import { createZip, downloadBlob, readZip } from './zip';
import type { Asset } from '../types/asset';

type AssetExportEntry = {
  title: string;
  kind: 'text' | 'image' | 'video';
  tags: string[];
  source: string;
  note: string;
  /** zip 内文件路径（文本/媒体二选一） */
  path: string;
};

type AssetsExportFile = {
  app: 'tuanzi-assets';
  version: 1;
  exportedAt: string;
  assets: AssetExportEntry[];
};

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_') || '素材';
}

function extFromMime(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  return 'bin';
}

async function fetchBlob(url: string) {
  const response = await fetch(mediaUrl(url));
  if (!response.ok) throw new Error('媒体下载失败');
  return response.blob();
}

/** 导出素材列表为 zip */
export async function exportAssets(assets: Asset[]) {
  const zipFiles: { name: string; data: BlobPart }[] = [];
  const entries: AssetExportEntry[] = [];
  const used = new Set<string>();
  const uniqueName = (base: string, ext: string) => {
    const safe = safeFileName(base);
    let name = `${safe}.${ext}`;
    for (let i = 1; used.has(name); i += 1) name = `${safe}-${i}.${ext}`;
    used.add(name);
    return name;
  };

  for (const asset of assets) {
    if (asset.kind === 'text') {
      const path = uniqueName(asset.title, 'txt');
      zipFiles.push({ name: path, data: asset.textContent || '' });
      entries.push({ title: asset.title, kind: 'text', tags: asset.tags || [], source: asset.source, note: asset.note, path });
    } else if (asset.media) {
      try {
        const blob = await fetchBlob(asset.media.url);
        const path = uniqueName(asset.title, extFromMime(asset.media.mimeType || blob.type));
        zipFiles.push({ name: path, data: blob });
        entries.push({ title: asset.title, kind: asset.kind, tags: asset.tags || [], source: asset.source, note: asset.note, path });
      } catch {
        // 单个媒体下载失败跳过，不阻断整体导出
      }
    }
  }

  const manifest: AssetsExportFile = { app: 'tuanzi-assets', version: 1, exportedAt: new Date().toISOString(), assets: entries };
  const zip = await createZip([{ name: 'assets.json', data: JSON.stringify(manifest, null, 2) }, ...zipFiles]);
  downloadBlob(zip, `素材导出-${new Date().toISOString().slice(0, 10)}.zip`);
  return entries.length;
}

/** 从 zip 导入素材，返回导入数量 */
export async function importAssets(file: Blob) {
  const entries = await readZip(file);
  const manifestBlob = entries.get('assets.json');
  let imported = 0;

  if (manifestBlob) {
    // 有清单：按清单还原（保留标题/标签/来源/备注）
    let manifest: AssetsExportFile;
    try {
      manifest = JSON.parse(await manifestBlob.text()) as AssetsExportFile;
    } catch {
      throw new Error('导出清单解析失败，文件可能已损坏');
    }
    for (const entry of manifest.assets) {
      const blob = entries.get(entry.path);
      if (!blob) continue;
      try {
        await importOne(entry, blob);
        imported += 1;
      } catch {
        // 单个素材导入失败不中断整体（与导出侧逐项跳过对称）
      }
    }
    return imported;
  }

  // 无清单：按扩展名推断类型
  for (const [path, blob] of entries) {
    const title = path.split('/').pop()?.replace(/\.[^.]+$/, '') || path;
    const ext = path.split('.').pop()?.toLowerCase() || '';
    try {
      if (ext === 'txt' || ext === 'md') {
        await importOne({ title, kind: 'text', tags: [], source: '', note: '', path }, blob);
      } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        await importOne({ title, kind: 'image', tags: [], source: '', note: '', path }, blob);
      } else if (['mp4', 'webm'].includes(ext)) {
        await importOne({ title, kind: 'video', tags: [], source: '', note: '', path }, blob);
      } else {
        continue;
      }
      imported += 1;
    } catch {
      // 单个素材导入失败不中断整体
    }
  }
  return imported;
}

async function importOne(entry: AssetExportEntry, blob: Blob) {
  const base = { title: entry.title, tags: entry.tags, source: entry.source || undefined, note: entry.note || undefined };
  if (entry.kind === 'text') {
    await assetsApi.create({ ...base, kind: 'text', textContent: await blob.text() });
    return;
  }
  const ext = entry.path.split('.').pop() || 'bin';
  const media = await mediaApi.upload(new File([blob], `${entry.title}.${ext}`, { type: blob.type || undefined }));
  await assetsApi.create({ ...base, kind: entry.kind, mediaId: media.id });
}
