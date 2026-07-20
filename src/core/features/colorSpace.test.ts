import { describe, it, expect } from 'vitest';
import { rgbToHsv, rgbToLab, labDistance, rgbToHex } from './colorSpace';

describe('rgbToHsv', () => {
  it('純赤/純緑/純青の色相', () => {
    expect(rgbToHsv(255, 0, 0).h).toBeCloseTo(0, 1);
    expect(rgbToHsv(0, 255, 0).h).toBeCloseTo(120, 1);
    expect(rgbToHsv(0, 0, 255).h).toBeCloseTo(240, 1);
  });
  it('グレーは彩度0', () => {
    expect(rgbToHsv(128, 128, 128).s).toBeCloseTo(0, 5);
  });
  it('白は明度1・彩度0、黒は明度0', () => {
    expect(rgbToHsv(255, 255, 255).v).toBeCloseTo(1, 5);
    expect(rgbToHsv(255, 255, 255).s).toBeCloseTo(0, 5);
    expect(rgbToHsv(0, 0, 0).v).toBeCloseTo(0, 5);
  });
});

describe('rgbToLab', () => {
  it('白は L≈100, a≈0, b≈0', () => {
    const [L, a, b] = rgbToLab(255, 255, 255);
    expect(L).toBeCloseTo(100, 0);
    expect(a).toBeCloseTo(0, 0);
    expect(b).toBeCloseTo(0, 0);
  });
  it('黒は L≈0', () => {
    expect(rgbToLab(0, 0, 0)[0]).toBeCloseTo(0, 1);
  });
  it('同色間の距離は0、赤と緑は大きい', () => {
    expect(labDistance(rgbToLab(10, 20, 30), rgbToLab(10, 20, 30))).toBeCloseTo(0, 6);
    expect(labDistance(rgbToLab(255, 0, 0), rgbToLab(0, 255, 0))).toBeGreaterThan(80);
  });
});

describe('rgbToHex', () => {
  it('丸めとクランプ', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 128, 255)).toBe('#0080ff');
    expect(rgbToHex(300, -5, 127.6)).toBe('#ff0080');
  });
});
