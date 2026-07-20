/// <reference lib="webworker" />
import { bitmapToFeature, metadataOnlyFeature } from '../io/imageFeature';

const HEAD_BYTES = 256 * 1024;

interface AnalyzeMsg {
  type: 'analyze';
  files: File[];
}

self.onmessage = async (e: MessageEvent<AnalyzeMsg>) => {
  const { files } = e.data;
  const canvas = new OffscreenCanvas(64, 64);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const id = `p${i}`;
    const head = await file.slice(0, HEAD_BYTES).arrayBuffer();
    try {
      const bitmap = await createImageBitmap(file);
      const feature = bitmapToFeature(
        { id, name: file.name, sizeBytes: file.size, lastModified: file.lastModified, headBytes: head, bitmap },
        canvas,
      );
      bitmap.close();
      self.postMessage({ type: 'feature', feature });
    } catch {
      self.postMessage({
        type: 'feature',
        feature: metadataOnlyFeature(id, file.name, file.size, file.lastModified, head),
        skipped: true,
      });
    }
    self.postMessage({ type: 'progress', done: i + 1, total: files.length });
  }
  self.postMessage({ type: 'done' });
};
