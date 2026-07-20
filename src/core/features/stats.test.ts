import { describe, it, expect } from 'vitest';
import { brightness, contrast, warmth, highlightRatio, lumaVariance, toGrayscale } from './stats';
import { sobelEdgeDensity } from './edges';
import { solid, checkerboard, grayscale } from '../../../test/fixtures/pixels';

describe('brightness', () => {
  it('黒=0, 白=1, 中間グレー≈0.5', () => {
    expect(brightness(solid(8, 8, 0, 0, 0))).toBeCloseTo(0, 5);
    expect(brightness(solid(8, 8, 255, 255, 255))).toBeCloseTo(1, 5);
    expect(brightness(solid(8, 8, 128, 128, 128))).toBeCloseTo(128 / 255, 3);
  });
});

describe('contrast / lumaVariance', () => {
  it('一様画像はコントラスト0・分散0', () => {
    expect(contrast(solid(8, 8, 100, 100, 100))).toBeCloseTo(0, 6);
    expect(lumaVariance(solid(8, 8, 100, 100, 100))).toBeCloseTo(0, 6);
  });
  it('市松模様は高コントラスト', () => {
    expect(contrast(checkerboard(8, 8))).toBeGreaterThan(0.4);
  });
});

describe('warmth', () => {
  it('暖色(赤)は正、寒色(青)は負', () => {
    expect(warmth(solid(4, 4, 200, 100, 50))).toBeGreaterThan(0);
    expect(warmth(solid(4, 4, 50, 100, 200))).toBeLessThan(0);
  });
});

describe('highlightRatio', () => {
  it('全白は1、全黒は0', () => {
    expect(highlightRatio(solid(4, 4, 255, 255, 255))).toBeCloseTo(1, 5);
    expect(highlightRatio(solid(4, 4, 0, 0, 0))).toBeCloseTo(0, 5);
  });
});

describe('sobelEdgeDensity', () => {
  it('一様グレーはエッジ0', () => {
    const g = grayscale(solid(16, 16, 120, 120, 120), 16, 16);
    expect(sobelEdgeDensity(g, 16, 16)).toBeCloseTo(0, 6);
  });
  it('市松模様は高エッジ密度', () => {
    // 1px 市松は Nyquist で Sobel が相殺するため、2px ブロックで検証する
    const g = grayscale(checkerboard(16, 16, 2), 16, 16);
    expect(sobelEdgeDensity(g, 16, 16)).toBeGreaterThan(0.5);
  });
});

describe('toGrayscale', () => {
  it('長さ w*h、白は1に近い', () => {
    const g = toGrayscale(solid(4, 4, 255, 255, 255), 4, 4);
    expect(g.length).toBe(16);
    expect(g[0]).toBeCloseTo(1, 5);
  });
});
