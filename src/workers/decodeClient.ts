import type { PhotoFeature } from '../core/types';
import { analyzeOnMain, type AnalyzeProgress, type DecodeOutput, type SkippedPhoto } from '../io/decodeImage';

export type { AnalyzeProgress, SkippedPhoto } from '../io/decodeImage';

export interface AnalyzeResult {
  features: PhotoFeature[];
  skipped: SkippedPhoto[];
  /** id → 元 File。UI がカバー画像の object URL を作るのに使う。 */
  fileById: Map<string, File>;
}

function workerSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

function analyzeWithWorker(
  files: File[],
  onProgress?: (p: AnalyzeProgress) => void,
): Promise<DecodeOutput> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./decode.worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(err);
      return;
    }
    const features: PhotoFeature[] = [];
    const skipped: SkippedPhoto[] = [];
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'feature') {
        features.push(m.feature as PhotoFeature);
        if (m.skipped) skipped.push({ id: m.feature.id, name: m.feature.name, reason: 'decode' });
      } else if (m.type === 'progress') {
        onProgress?.({ done: m.done, total: m.total });
      } else if (m.type === 'done') {
        worker.terminate();
        resolve({ features, skipped });
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ type: 'analyze', files });
  });
}

/**
 * 端末上のファイルを解析して PhotoFeature[] を返す。可能なら worker（OffscreenCanvas）で
 * メインスレッドを止めずに処理し、失敗・非対応時はメインスレッドにフォールバックする。
 * 画像は一切ネットワークに出さない。
 */
export async function analyzeFiles(
  files: File[],
  onProgress?: (p: AnalyzeProgress) => void,
): Promise<AnalyzeResult> {
  const fileById = new Map<string, File>();
  files.forEach((f, i) => fileById.set(`p${i}`, f));

  let out: DecodeOutput;
  if (workerSupported()) {
    try {
      out = await analyzeWithWorker(files, onProgress);
    } catch {
      out = await analyzeOnMain(files, onProgress);
    }
  } else {
    out = await analyzeOnMain(files, onProgress);
  }
  return { ...out, fileById };
}
