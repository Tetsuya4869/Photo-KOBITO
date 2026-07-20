import { describe, it, expect } from 'vitest';
import { buildTimeline, DEFAULT_TIMELINE } from './timeline';
import { feat, T } from '../../../test/fixtures/feature';
import type { PhotoFeature } from '../types';

function series(day: [number, number, number], hours: number[], prefix: string, gps?: { lat: number; lon: number }): PhotoFeature[] {
  return hours.map((h, i) => feat(`${prefix}-${i}`, { takenAt: T(day[0], day[1], day[2], h, (i * 7) % 60), gps: gps ?? null }));
}

describe('buildTimeline', () => {
  it('4時間以上あくとセッション（同日は day にまとまる）', () => {
    // 同じ日: 9時台に3枚、その後6時間あけて16時台に3枚 → 同一 day
    const feats = [
      ...series([2026, 7, 1], [9, 9, 9], 'am'),
      ...series([2026, 7, 1], [16, 16, 16], 'pm'),
    ];
    const clusters = buildTimeline(feats, null);
    expect(clusters.length).toBe(1);
    expect(clusters[0].kind).toBe('day');
    expect(clusters[0].photoIds.length).toBe(6);
  });

  it('別々の日（橋渡し範囲外）は別の day', () => {
    const feats = [
      ...series([2026, 7, 1], [10, 11], 'd1'),
      ...series([2026, 7, 5], [10, 11], 'd2'),
    ];
    const clusters = buildTimeline(feats, null);
    expect(clusters.length).toBe(2);
    expect(clusters.every((c) => c.kind === 'day')).toBe(true);
  });

  it('連続2日・20枚以上・遠方 GPS → trip 昇格（2泊…ではなく1泊=nights1）', () => {
    const home = { lat: 35.68, lon: 139.76 };
    const far = { lat: 34.7, lon: 135.5 }; // 大阪（東京から遠い）
    const d1 = Array.from({ length: 12 }, (_, i) =>
      feat(`t1-${i}`, { takenAt: T(2026, 7, 10, 9 + (i % 8), i * 3), gps: far }),
    );
    const d2 = Array.from({ length: 12 }, (_, i) =>
      feat(`t2-${i}`, { takenAt: T(2026, 7, 11, 9 + (i % 8), i * 3), gps: far }),
    );
    const clusters = buildTimeline([...d1, ...d2], home);
    expect(clusters.length).toBe(1);
    expect(clusters[0].kind).toBe('trip');
    expect(clusters[0].nights).toBe(1);
    expect(clusters[0].dayCount).toBe(2);
  });

  it('近所での連続2日（遠方でない）は trip にしない', () => {
    const home = { lat: 35.68, lon: 139.76 };
    const near = { lat: 35.69, lon: 139.77 }; // 自宅すぐそば
    const d1 = Array.from({ length: 12 }, (_, i) => feat(`n1-${i}`, { takenAt: T(2026, 7, 10, 9 + (i % 8), i * 3), gps: near }));
    const d2 = Array.from({ length: 12 }, (_, i) => feat(`n2-${i}`, { takenAt: T(2026, 7, 11, 9 + (i % 8), i * 3), gps: near }));
    const clusters = buildTimeline([...d1, ...d2], home);
    expect(clusters.every((c) => c.kind === 'day')).toBe(true);
  });

  it('深夜またぎ（23:50→翌00:20, gap<4h）はセッション分割しない', () => {
    const feats = [
      feat('a', { takenAt: T(2026, 7, 1, 23, 50) }),
      feat('b', { takenAt: T(2026, 7, 2, 0, 20) }),
    ];
    const clusters = buildTimeline(feats, null);
    expect(clusters.length).toBe(1);
    expect(clusters[0].photoIds.sort()).toEqual(['a', 'b']);
  });

  it('EXIF 日時が無い写真は除外（時間クラスタに現れない）', () => {
    const feats = [feat('a', { takenAt: T(2026, 7, 1, 10) }), feat('noTime', { takenAt: null })];
    const clusters = buildTimeline(feats, null);
    const ids = clusters.flatMap((c) => c.photoIds);
    expect(ids).not.toContain('noTime');
  });

  it('countedIds で連写の水増しを除いて trip 枚数を数える', () => {
    const home = { lat: 35.68, lon: 139.76 };
    const far = { lat: 34.7, lon: 135.5 };
    // 2日・合計25枚だが、うち10枚は連写非代表 → counted=15 で trip 未満
    const all = Array.from({ length: 25 }, (_, i) =>
      feat(`p-${i}`, { takenAt: T(2026, 7, 10 + (i % 2), 9 + (i % 8), i), gps: far }),
    );
    const counted = new Set(all.slice(0, 15).map((f) => f.id));
    const clusters = buildTimeline(all, home, DEFAULT_TIMELINE, counted);
    // counted=15 < 20 なので trip にならない
    expect(clusters.some((c) => c.kind === 'trip')).toBe(false);
  });
});
