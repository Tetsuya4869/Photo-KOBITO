import type { PhotoFeature } from '../../src/core/types';

/** テスト用の PhotoFeature ファクトリ（妥当なデフォルト + 上書き）。 */
export function feat(id: string, over: Partial<PhotoFeature> = {}): PhotoFeature {
  return {
    id,
    name: `${id}.jpg`,
    sizeBytes: 1_000_000,
    width: 4000,
    height: 3000,
    aspect: 4000 / 3000,
    takenAt: null,
    takenAtSource: 'exif',
    gps: null,
    camera: { make: 'Apple', model: 'iPhone', fNumber: 1.8, iso: 100 },
    phash: '0000000000000000',
    colors: [{ hex: '#808080', lab: [53, 0, 0], weight: 1 }],
    brightness: 0.5,
    saturation: 0.3,
    contrast: 0.2,
    edgeDensity: 0.2,
    warmth: 0,
    colorfulness: 30,
    blueTopRatio: 0,
    greenRatio: 0,
    lumaVariance: 0.04,
    ...over,
  };
}

export const T = (y: number, mo: number, d: number, h = 12, mi = 0, s = 0) =>
  Date.UTC(y, mo - 1, d, h, mi, s);
