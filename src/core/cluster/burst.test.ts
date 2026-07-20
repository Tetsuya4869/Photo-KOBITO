import { describe, it, expect } from 'vitest';
import { detectBursts, DEFAULT_BURST } from './burst';
import type { PhotoFeature } from '../types';

function feat(id: string, phash: string, takenAt: number | null, over: Partial<PhotoFeature> = {}): PhotoFeature {
  return {
    id,
    name: id,
    sizeBytes: 1000,
    width: 100,
    height: 100,
    aspect: 1,
    takenAt,
    takenAtSource: 'exif',
    gps: null,
    camera: null,
    phash,
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
    ...over,
  };
}

const T0 = Date.UTC(2026, 6, 5, 16, 0, 0);

describe('detectBursts', () => {
  it('3秒以内・pHash 近接の3枚 → 1バースト（subtype=burst）', () => {
    const base = 'ffffffff00000000';
    const feats = [
      feat('a', base, T0),
      feat('b', 'ffffffef00000000', T0 + 500), // 1bit差
      feat('c', 'ffffffff00000001', T0 + 1000), // 数bit差
    ];
    const groups = detectBursts(feats);
    expect(groups.length).toBe(1);
    expect(groups[0].subtype).toBe('burst');
    expect(groups[0].memberIds.sort()).toEqual(['a', 'b', 'c']);
  });

  it('時間が離れすぎると連結しない（dup 距離外・burst 時間外）', () => {
    const feats = [
      feat('a', 'ffffffff00000000', T0),
      feat('b', 'ffffff8000000000', T0 + 60_000), // hamming=7 (dup>5) かつ 60秒後(burst>3s)
    ];
    const groups = detectBursts(feats);
    expect(groups.length).toBe(0);
  });

  it('時間に関係なく極めて似た写真は dup として連結', () => {
    const base = 'abcdabcd12341234';
    const feats = [
      feat('a', base, T0),
      feat('b', base, T0 + 3_600_000), // 1時間後だが完全一致
    ];
    const groups = detectBursts(feats);
    expect(groups.length).toBe(1);
    expect(groups[0].subtype).toBe('dup');
  });

  it('フラットフレーム（全黒相当）は lumaVariance ガードで誤結合しない', () => {
    const base = '0000000000000000';
    const feats = [
      feat('a', base, T0, { lumaVariance: 0.0001 }),
      feat('b', base, T0 + 500, { lumaVariance: 0.0001 }),
      feat('c', base, T0 + 1000, { lumaVariance: 0.0001 }),
    ];
    const groups = detectBursts(feats);
    expect(groups.length).toBe(0);
  });

  it('cover は cover スコア最大の1枚（鮮鋭さ重視）', () => {
    const base = 'ffffffff00000000';
    const feats = [
      feat('a', base, T0, { edgeDensity: 0.1 }),
      feat('b', 'ffffffef00000000', T0 + 500, { edgeDensity: 0.9 }), // 最も鮮鋭
      feat('c', 'ffffffff00000001', T0 + 1000, { edgeDensity: 0.2 }),
    ];
    const groups = detectBursts(feats);
    expect(groups[0].coverId).toBe('b');
  });

  it('決定的: 同じ入力は同じ結果', () => {
    const feats = [
      feat('a', 'ffffffff00000000', T0),
      feat('b', 'ffffffef00000000', T0 + 500),
      feat('c', 'ffffffff00000001', T0 + 1000),
    ];
    expect(detectBursts(feats)).toEqual(detectBursts(feats.slice().reverse()));
  });
});

// DEFAULT_BURST の妥当性
describe('DEFAULT_BURST', () => {
  it('しきい値がドキュメント通り', () => {
    expect(DEFAULT_BURST.burstHamming).toBe(10);
    expect(DEFAULT_BURST.burstTimeS).toBe(3);
    expect(DEFAULT_BURST.dupHamming).toBe(5);
    expect(DEFAULT_BURST.minBurstSize).toBe(3);
  });
});
