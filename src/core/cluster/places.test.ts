import { describe, it, expect } from 'vitest';
import { buildPlaces } from './places';
import { feat, T } from '../../../test/fixtures/feature';

describe('buildPlaces', () => {
  it('GPS が1枚も無ければ空（無害スキップ）', () => {
    const feats = [feat('a'), feat('b'), feat('c')];
    expect(buildPlaces(feats)).toEqual([]);
  });

  it('近接する3枚以上を1つの場所にまとめる', () => {
    const spot = { lat: 34.9949, lon: 135.785 };
    const feats = [
      feat('a', { gps: { lat: spot.lat, lon: spot.lon }, takenAt: T(2026, 7, 1, 10) }),
      feat('b', { gps: { lat: spot.lat + 0.0005, lon: spot.lon }, takenAt: T(2026, 7, 1, 11) }),
      feat('c', { gps: { lat: spot.lat, lon: spot.lon + 0.0005 }, takenAt: T(2026, 7, 1, 12) }),
    ];
    const places = buildPlaces(feats);
    expect(places.length).toBe(1);
    expect(places[0].photoIds.sort()).toEqual(['a', 'b', 'c']);
    expect(places[0].centroid.lat).toBeCloseTo(spot.lat, 3);
  });

  it('離れた2群 → 2つの場所、孤立点は除外', () => {
    const kyoto = { lat: 34.9949, lon: 135.785 };
    const tokyo = { lat: 35.6812, lon: 139.7671 };
    const feats = [
      feat('k1', { gps: { ...kyoto } }),
      feat('k2', { gps: { lat: kyoto.lat + 0.0005, lon: kyoto.lon } }),
      feat('k3', { gps: { lat: kyoto.lat, lon: kyoto.lon + 0.0005 } }),
      feat('t1', { gps: { ...tokyo } }),
      feat('t2', { gps: { lat: tokyo.lat + 0.0005, lon: tokyo.lon } }),
      feat('t3', { gps: { lat: tokyo.lat, lon: tokyo.lon + 0.0005 } }),
      feat('lonely', { gps: { lat: 40, lon: 140 } }),
    ];
    const places = buildPlaces(feats);
    expect(places.length).toBe(2);
    const allIds = places.flatMap((p) => p.photoIds);
    expect(allIds).not.toContain('lonely');
  });

  it('決定的な並び', () => {
    const spot = { lat: 35, lon: 139 };
    const feats = Array.from({ length: 5 }, (_, i) =>
      feat(`p${i}`, { gps: { lat: spot.lat + i * 0.0002, lon: spot.lon }, takenAt: T(2026, 7, 1, 10 + i) }),
    );
    expect(buildPlaces(feats)).toEqual(buildPlaces(feats.slice().reverse()));
  });
});
