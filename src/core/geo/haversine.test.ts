import { describe, it, expect } from 'vitest';
import { haversineMeters, isValidGps } from './haversine';

describe('haversineMeters', () => {
  it('同一地点は0', () => {
    expect(haversineMeters({ lat: 35, lon: 139 }, { lat: 35, lon: 139 })).toBeCloseTo(0, 5);
  });
  it('東京駅〜大阪駅は約 400km', () => {
    const d = haversineMeters({ lat: 35.6812, lon: 139.7671 }, { lat: 34.7025, lon: 135.4959 });
    expect(d).toBeGreaterThan(390_000);
    expect(d).toBeLessThan(415_000);
  });
  it('東京駅〜皇居は約 1.5km 以内', () => {
    const d = haversineMeters({ lat: 35.6812, lon: 139.7671 }, { lat: 35.6852, lon: 139.7528 });
    expect(d).toBeLessThan(1500);
  });
  it('子午線をまたぐ距離', () => {
    const d = haversineMeters({ lat: 0, lon: 179.9 }, { lat: 0, lon: -179.9 });
    // 経度差 0.2 度 ≈ 22km
    expect(d).toBeGreaterThan(20_000);
    expect(d).toBeLessThan(24_000);
  });
});

describe('isValidGps', () => {
  it('通常座標は有効', () => {
    expect(isValidGps(35.68, 139.76)).toBe(true);
    expect(isValidGps(-33.86, 151.21)).toBe(true);
  });
  it('null island (0,0) は棄却', () => {
    expect(isValidGps(0, 0)).toBe(false);
  });
  it('範囲外・NaN は棄却', () => {
    expect(isValidGps(91, 0)).toBe(false);
    expect(isValidGps(0, 181)).toBe(false);
    expect(isValidGps(NaN, 10)).toBe(false);
  });
});
