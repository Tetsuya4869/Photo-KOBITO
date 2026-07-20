import { describe, it, expect } from 'vitest';
import { dominantColors, meanSaturation, colorfulness, blueTopRatio, greenRatio } from './color';
import { mulberry32 } from '../util/seededRandom';
import { solid, skyAndGround } from '../../../test/fixtures/pixels';

describe('dominantColors', () => {
  it('単色画像は1色が支配的（weight≈1）', () => {
    const px = solid(16, 16, 200, 50, 50);
    const rng = mulberry32(42);
    const colors = dominantColors(px, 16, 16, rng);
    expect(colors.length).toBeGreaterThanOrEqual(1);
    expect(colors[0].weight).toBeGreaterThan(0.9);
    expect(colors[0].hex).toBe('#c83232');
  });

  it('決定的: 同じ seed で 2 回実行すると完全一致', () => {
    const px = skyAndGround(32, 32);
    const a = dominantColors(px, 32, 32, mulberry32(7));
    const b = dominantColors(px, 32, 32, mulberry32(7));
    expect(a).toEqual(b);
  });

  it('weight は降順で合計 <= 1', () => {
    const px = skyAndGround(24, 24);
    const colors = dominantColors(px, 24, 24, mulberry32(1));
    for (let i = 1; i < colors.length; i++) {
      expect(colors[i - 1].weight).toBeGreaterThanOrEqual(colors[i].weight);
    }
    const sum = colors.reduce((s, c) => s + c.weight, 0);
    expect(sum).toBeLessThanOrEqual(1.0001);
  });
});

describe('meanSaturation', () => {
  it('グレーは彩度0、鮮やかな赤は高い', () => {
    expect(meanSaturation(solid(8, 8, 128, 128, 128))).toBeCloseTo(0, 5);
    expect(meanSaturation(solid(8, 8, 255, 0, 0))).toBeCloseTo(1, 5);
  });
});

describe('colorfulness', () => {
  it('グレーは低く、彩度の高い混色は高い', () => {
    expect(colorfulness(solid(8, 8, 128, 128, 128))).toBeLessThan(1);
    expect(colorfulness(skyAndGround(16, 16))).toBeGreaterThan(20);
  });
});

describe('blueTopRatio / greenRatio', () => {
  it('空と地面の画像: 上半分が青、下半分に緑', () => {
    const px = skyAndGround(32, 32);
    expect(blueTopRatio(px, 32, 32)).toBeGreaterThan(0.8);
    expect(greenRatio(px)).toBeGreaterThan(0.3);
  });
  it('単色の赤は青空率も緑率もほぼ0', () => {
    const px = solid(16, 16, 220, 40, 40);
    expect(blueTopRatio(px, 16, 16)).toBeLessThan(0.05);
    expect(greenRatio(px)).toBeLessThan(0.05);
  });
});
