// Ported from infinite-canvas (https://github.com/basketikun/infinite-canvas), AGPL-3.0. See NOTICE.
// 源文件：web/src/lib/zip.ts（fflate 打包/解包，零压缩级别足够媒体文件用）
import { unzipSync, zipSync } from 'fflate';

type ZipFile = {
  name: string;
  data: BlobPart;
};

export async function createZip(files: ZipFile[]) {
  const entries = await Promise.all(
    files.map(async (file) => {
      const data = new Uint8Array(await new Blob([file.data]).arrayBuffer());
      return [file.name, data] as const;
    }),
  );
  return new Blob([zipSync(Object.fromEntries(entries), { level: 0 })], { type: 'application/zip' });
}

export async function readZip(file: Blob) {
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  return new Map(Object.entries(entries).map(([name, data]) => [name, new Blob([data])]));
}

/** 触发浏览器下载（替代 file-saver 的 saveAs） */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // 延迟 revoke：部分浏览器（Firefox/Safari）在下载尚未开始时 revoke 会导致下载失败
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
