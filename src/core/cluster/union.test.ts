import { describe, it, expect } from 'vitest';
import { jaccard, dedupeByJaccard, albumPriority } from './union';
import type { AlbumDraft } from '../types';

function draft(kind: AlbumDraft['kind'], ids: string[]): AlbumDraft {
  return { kind, photoIds: ids, coverId: ids[0], confidence: 'med' };
}

describe('jaccard', () => {
  it('同一集合=1、非交差=0', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
    expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0);
  });
  it('部分重複', () => {
    expect(jaccard(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBeCloseTo(2 / 4, 6);
  });
});

describe('albumPriority', () => {
  it('旅行 > 場所 > その日 > シーン > 連写', () => {
    expect(albumPriority('trip')).toBeLessThan(albumPriority('place'));
    expect(albumPriority('place')).toBeLessThan(albumPriority('day'));
    expect(albumPriority('day')).toBeLessThan(albumPriority('scene'));
    expect(albumPriority('scene')).toBeLessThan(albumPriority('burst'));
  });
});

describe('dedupeByJaccard', () => {
  it('ほぼ同一の2アルバムは優先度の高い方を残す', () => {
    const trip = draft('trip', ['a', 'b', 'c', 'd', 'e']);
    const scene = draft('scene', ['a', 'b', 'c', 'd', 'e']); // 完全一致
    const kept = dedupeByJaccard([scene, trip], 0.8);
    expect(kept.length).toBe(1);
    expect(kept[0].kind).toBe('trip');
  });

  it('重複が閾値以下なら両方残す（レンズ共存）', () => {
    const a = draft('trip', ['a', 'b', 'c', 'd', 'e']);
    const b = draft('scene', ['a', 'x', 'y', 'z', 'w']); // 交差1/9
    const kept = dedupeByJaccard([a, b], 0.8);
    expect(kept.length).toBe(2);
  });

  it('決定的（入力順に依存しない）', () => {
    const t = draft('trip', ['a', 'b', 'c', 'd']);
    const s = draft('scene', ['a', 'b', 'c', 'd']);
    const p = draft('place', ['a', 'b', 'c', 'd']);
    const k1 = dedupeByJaccard([t, s, p], 0.8).map((d) => d.kind);
    const k2 = dedupeByJaccard([p, s, t], 0.8).map((d) => d.kind);
    expect(k1).toEqual(k2);
    expect(k1).toEqual(['trip']); // 最優先だけ残る
  });
});
