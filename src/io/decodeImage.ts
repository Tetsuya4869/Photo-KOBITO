import type { PhotoFeature } from '../core/types';
import { bitmapToFeature, metadataOnlyFeature } from './imageFeature';

export interface AnalyzeProgress {
  done: number;
  total: number;
}

export interface SkippedPhoto {
  id: string;
  name: string;
  reason: string;
}

export interface DecodeOutput {
  features: PhotoFeature[];
  skipped: SkippedPhoto[];
}

const HEAD_BYTES = 256 * 1024;

async function readHead(file: File): Promise<ArrayBuffer> {
  return file.slice(0, HEAD_BYTES).arrayBuffer();
}

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * メインスレッドでのデコード（古い Safari など OffscreenCanvas 非対応時のフォールバック）。
 * 数枚ごとに UI にコントロールを返して固まらないようにする。
 */
export async function analyzeOnMain(
  files: File[],
  onProgress?: (p: AnalyzeProgress) => void,
): Promise<DecodeOutput> {
  const canvas = document.createElement('canvas');
  const features: PhotoFeature[] = [];
  const skipped: SkippedPhoto[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const id = `p${i}`;
    const head = await readHead(file);
    try {
      const bitmap = await createImageBitmap(file);
      features.push(
        bitmapToFeature(
          { id, name: file.name, sizeBytes: file.size, lastModified: file.lastModified, headBytes: head, bitmap },
          canvas,
        ),
      );
      bitmap.close();
    } catch {
      // デコード不可（HEIC など）：日付・GPS だけ拝借してメタデータ feature に。
      features.push(metadataOnlyFeature(id, file.name, file.size, file.lastModified, head));
      skipped.push({ id, name: file.name, reason: 'decode' });
    }
    onProgress?.({ done: i + 1, total: files.length });
    if (i % 4 === 3) await yieldToUi();
  }
  return { features, skipped };
}
