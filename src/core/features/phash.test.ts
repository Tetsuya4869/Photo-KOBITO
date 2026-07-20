import { describe, it, expect } from 'vitest';
import { pHash, aHash, resampleGray } from './phash';
import { hamming } from './hamming';
import { checkerboard, solid, grayscale, verticalSplit } from '../../../test/fixtures/pixels';

describe('resampleGray', () => {
  it('同サイズはコピー', () => {
    const g = grayscale(solid(4, 4, 100, 100, 100), 4, 4);
    const r = resampleGray(g, 4, 4, 4, 4);
    expect(Array.from(r)).toEqual(Array.from(g));
  });
  it('縮小しても平均輝度は保たれる', () => {
    const g = grayscale(solid(64, 64, 128, 128, 128), 64, 64);
    const r = resampleGray(g, 64, 64, 32, 32);
    expect(r.length).toBe(1024);
    expect(r[0]).toBeCloseTo(128 / 255, 3);
  });
});

describe('pHash', () => {
  it('16 文字の hex を返す', () => {
    const g = grayscale(checkerboard(32, 32, 2), 32, 32);
    const h = pHash(g, 32, 32);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it('決定的: 同じ入力は同じハッシュ', () => {
    const g = grayscale(checkerboard(64, 64, 3), 64, 64);
    expect(pHash(g, 64, 64)).toBe(pHash(g, 64, 64));
  });

  it('同一画像の縮小版とは近い（Hamming <= 6）', () => {
    const big = grayscale(checkerboard(64, 64, 4), 64, 64);
    const small = grayscale(checkerboard(32, 32, 2), 32, 32);
    expect(hamming(pHash(big, 64, 64), pHash(small, 32, 32))).toBeLessThanOrEqual(6);
  });

  it('無相関な画像は遠い（Hamming >= 18）', () => {
    const a = grayscale(checkerboard(32, 32, 1), 32, 32);
    const b = grayscale(
      verticalSplit(32, 32, 16, [20, 20, 20], [200, 200, 200]),
      32,
      32,
    );
    expect(hamming(pHash(a, 32, 32), pHash(b, 32, 32))).toBeGreaterThanOrEqual(18);
  });
});

describe('aHash', () => {
  it('16 文字の hex を返し決定的', () => {
    const g = grayscale(checkerboard(16, 16, 2), 16, 16);
    expect(aHash(g, 16, 16)).toMatch(/^[0-9a-f]{16}$/);
    expect(aHash(g, 16, 16)).toBe(aHash(g, 16, 16));
  });
});
