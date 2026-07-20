import { describe, it, expect } from 'vitest';
import { nearestPlace, relativeName } from './gazetteer';

describe('nearestPlace', () => {
  it('清水寺の座標 → 清水寺（近距離）', () => {
    const p = nearestPlace(34.9949, 135.785);
    expect(p).not.toBeNull();
    expect(p!.name).toBe('清水寺');
    expect(p!.distM).toBeLessThan(500);
  });

  it('那覇付近 → 那覇/首里城/那覇空港いずれか（近距離）', () => {
    const p = nearestPlace(26.2124, 127.6809);
    expect(p).not.toBeNull();
    expect(p!.distM).toBeLessThan(3000);
  });

  it('太平洋のど真ん中 → 最近傍はあるが distM が非常に大きい（半径外扱いは呼び出し側）', () => {
    const p = nearestPlace(20, 160);
    expect(p).not.toBeNull();
    expect(p!.distM).toBeGreaterThan(1_000_000);
  });
});

describe('relativeName', () => {
  it('自宅・初訪問・再訪の相対名', () => {
    expect(relativeName(true, true)).toBe('いつもの場所');
    expect(relativeName(false, false)).toBe('はじめての場所');
    expect(relativeName(false, true)).toBe('この場所');
  });
});
