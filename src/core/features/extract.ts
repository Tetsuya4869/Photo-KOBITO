import type { CameraInfo, ExifData, PhotoFeature } from '../types';
import { isValidGps } from '../geo/haversine';
import {
  brightness,
  contrast,
  warmth,
  lumaVariance,
  toGrayscale,
} from './stats';
import {
  dominantColors,
  meanSaturation,
  colorfulness,
  blueTopRatio,
  greenRatio,
} from './color';
import { sobelEdgeDensity } from './edges';
import { pHash } from './phash';

export interface ExtractInput {
  id: string;
  name: string;
  sizeBytes: number;
  /** 元画像の実ピクセルサイズ。 */
  width: number;
  height: number;
  /** ダウンスケール済みワーク画像（RGBA, 長さ workW*workH*4）。 */
  rgba: ArrayLike<number>;
  workW: number;
  workH: number;
  exif: ExifData;
  /** File.lastModified（EXIF に日時が無いとき使う）。 */
  lastModified: number;
  /** 決定的な支配色抽出のための seed 付き乱数。 */
  rng: () => number;
  /** 表示用カバーサムネ（data URL）。 */
  coverThumb?: string;
}

/**
 * デコード済みピクセル + EXIF から PhotoFeature を組み立てる純オーケストレータ。
 * ピクセル in → feature out。DOM に一切依存しない。
 */
export function extractFeatures(input: ExtractInput): PhotoFeature {
  const { rgba, workW, workH } = input;
  const gray = toGrayscale(rgba, workW, workH);

  const takenAt = input.exif.takenAt ?? (Number.isFinite(input.lastModified) ? input.lastModified : null);
  const takenAtSource = input.exif.takenAt != null ? 'exif' : 'mtime';

  const gps =
    input.exif.gps && isValidGps(input.exif.gps.lat, input.exif.gps.lon)
      ? input.exif.gps
      : null;

  const camera = buildCamera(input.exif);

  const width = input.width > 0 ? input.width : workW;
  const height = input.height > 0 ? input.height : workH;

  return {
    id: input.id,
    name: input.name,
    sizeBytes: input.sizeBytes,
    width,
    height,
    aspect: height > 0 ? width / height : 1,
    takenAt,
    takenAtSource,
    gps,
    camera,
    phash: pHash(gray, workW, workH),
    colors: dominantColors(rgba, workW, workH, input.rng),
    brightness: brightness(rgba),
    saturation: meanSaturation(rgba),
    contrast: contrast(rgba),
    edgeDensity: sobelEdgeDensity(gray, workW, workH),
    warmth: warmth(rgba),
    colorfulness: colorfulness(rgba),
    blueTopRatio: blueTopRatio(rgba, workW, workH),
    greenRatio: greenRatio(rgba),
    lumaVariance: lumaVariance(rgba),
    coverThumb: input.coverThumb,
  };
}

function buildCamera(exif: ExifData): CameraInfo | null {
  const c: CameraInfo = {};
  let any = false;
  if (exif.make) {
    c.make = exif.make;
    any = true;
  }
  if (exif.model) {
    c.model = exif.model;
    any = true;
  }
  if (exif.fNumber != null) {
    c.fNumber = exif.fNumber;
    any = true;
  }
  if (exif.iso != null) {
    c.iso = exif.iso;
    any = true;
  }
  if (exif.focalLength != null) {
    c.focalLength = exif.focalLength;
    any = true;
  }
  if (exif.exposure != null) {
    c.exposure = exif.exposure;
    any = true;
  }
  return any ? c : null;
}
