import type { PhotoFeature } from '../core/types';
import { parseExif } from '../core/features/exif';
import { extractFeatures } from '../core/features/extract';
import { isValidGps } from '../core/geo/haversine';
import { mulberry32 } from '../core/util/seededRandom';

/** 特徴抽出に使うワーク画像の一辺（正方形に縮小）。 */
export const WORK_EDGE = 64;

/** 文字列 → 32bit シード（FNV-1a）。決定的な支配色抽出のため写真ごとに固定シードを与える。 */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type AnyCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface BitmapInput {
  id: string;
  name: string;
  sizeBytes: number;
  lastModified: number;
  /** EXIF 抽出用の先頭バイト列。 */
  headBytes: ArrayBuffer;
  bitmap: ImageBitmap;
}

/**
 * デコード済み ImageBitmap + EXIF から PhotoFeature を組み立てる。
 * worker（OffscreenCanvas）・メインスレッド（HTMLCanvasElement）の両方から呼べるよう、
 * 描画先 canvas を引数で受け取る。ピクセルは返さない（軽量な feature のみ）。
 */
export function bitmapToFeature(input: BitmapInput, canvas: AnyCanvas): PhotoFeature {
  canvas.width = WORK_EDGE;
  canvas.height = WORK_EDGE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings) as AnyCtx | null;
  if (!ctx) throw new Error('2D context unavailable');
  ctx.clearRect(0, 0, WORK_EDGE, WORK_EDGE);
  // 正方形に押し込む（全体の色/エッジ傾向を見るには十分。アスペクトは別途保持）。
  ctx.drawImage(input.bitmap, 0, 0, WORK_EDGE, WORK_EDGE);
  const { data } = ctx.getImageData(0, 0, WORK_EDGE, WORK_EDGE);
  const exif = parseExif(input.headBytes);
  return extractFeatures({
    id: input.id,
    name: input.name,
    sizeBytes: input.sizeBytes,
    width: input.bitmap.width,
    height: input.bitmap.height,
    rgba: data,
    workW: WORK_EDGE,
    workH: WORK_EDGE,
    exif,
    lastModified: input.lastModified,
    rng: mulberry32(seedFromString(input.id)),
  });
}

/**
 * デコードできなかった写真（HEIC など）向けのメタデータのみ feature。
 * ピクセル特徴は中立、pHash は名前由来で一意にして連写に誤結合させない。
 * EXIF の日時・GPS は活かすので、時間・場所のアルバムには参加できる。
 */
export function metadataOnlyFeature(
  id: string,
  name: string,
  sizeBytes: number,
  lastModified: number,
  headBytes: ArrayBuffer,
): PhotoFeature {
  const exif = parseExif(headBytes);
  const seed = seedFromString(id);
  const hex = (seed >>> 0).toString(16).padStart(8, '0');
  const hex2 = (Math.imul(seed, 2654435761) >>> 0).toString(16).padStart(8, '0');
  // デコード済み画像と同じ GPS 検証を適用（null-island (0,0) 等がジオクラスタに漏れないように）。
  const gps = exif.gps && isValidGps(exif.gps.lat, exif.gps.lon) ? exif.gps : null;
  return {
    id,
    name,
    sizeBytes,
    width: 0,
    height: 0,
    aspect: 1,
    takenAt: exif.takenAt ?? (Number.isFinite(lastModified) ? lastModified : null),
    takenAtSource: exif.takenAt != null ? 'exif' : 'mtime',
    gps,
    camera: exif.make || exif.model ? { make: exif.make, model: exif.model } : null,
    phash: hex + hex2,
    colors: [],
    brightness: 0.5,
    saturation: 0.3,
    contrast: 0.2,
    edgeDensity: 0.2,
    warmth: 0,
    colorfulness: 30,
    blueTopRatio: 0,
    greenRatio: 0,
    lumaVariance: 0.04,
  };
}
