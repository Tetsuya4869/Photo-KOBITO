import { describe, it, expect } from 'vitest';
import { buildAlbums } from './buildAlbums';
import { makeDemoFeatures } from './demoData';
import { jaccard } from '../core/cluster/union';
import { feat, T } from '../../test/fixtures/feature';

const demo = makeDemoFeatures(42);

describe('buildAlbums — ゴールデン（デモデータ）', () => {
  const albums = buildAlbums(demo, { seed: 42 });

  it('写真ロスなし: すべての写真が最低1つのアルバムに入る', () => {
    const covered = new Set(albums.flatMap((a) => a.photoIds));
    expect(covered.size).toBe(demo.length);
  });

  it('決定的: 同じ入力は同じ出力', () => {
    expect(buildAlbums(demo, { seed: 42 })).toEqual(albums);
  });

  it('入力順に依存しない（シャッフルしても同一）', () => {
    const shuffled = demo.slice().reverse();
    expect(buildAlbums(shuffled, { seed: 42 })).toEqual(albums);
  });

  it('アルバム間に Jaccard>0.8 の重複ペアが無い', () => {
    for (let i = 0; i < albums.length; i++) {
      for (let j = i + 1; j < albums.length; j++) {
        const jac = jaccard(new Set(albums[i].photoIds), new Set(albums[j].photoIds));
        expect(jac).toBeLessThanOrEqual(0.8);
      }
    }
  });

  it('各アルバムの cover は自分の写真に含まれ、タイトル/理由/絵文字が空でない', () => {
    for (const a of albums) {
      expect(a.photoIds).toContain(a.coverId);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.reason.length).toBeGreaterThan(0);
      expect(a.emoji.length).toBeGreaterThan(0);
    }
  });

  it('期待するアルバム構成（種類・タイトル・枚数）を再現', () => {
    const shape = albums.map((a) => ({ kind: a.kind, title: a.title, n: a.photoIds.length }));
    expect(shape).toEqual([
      { kind: 'trip', title: '那覇、2泊3日の旅', n: 42 },
      { kind: 'place', title: 'いつもの場所', n: 28 },
      { kind: 'day', title: '6月13日のおでかけ', n: 7 },
      { kind: 'scene', title: '夜さんぽ', n: 8 },
      { kind: 'scene', title: '青空コレクション', n: 25 },
      { kind: 'scene', title: 'おいしいもの記録', n: 15 },
      { kind: 'scene', title: 'モノクロ写真', n: 6 },
      { kind: 'burst', title: 'そっくりさんフォト（12枚）', n: 12 },
      { kind: 'screenshot', title: 'スクショ整理', n: 18 },
      { kind: 'monthly', title: 'いつかの写真たち', n: 2 },
    ]);
  });
});

describe('buildAlbums — 基本ケース', () => {
  it('空入力は空配列', () => {
    expect(buildAlbums([])).toEqual([]);
  });

  it('1枚でも必ずどこかのアルバムに入る（月次回収）', () => {
    const albums = buildAlbums([feat('solo', { takenAt: T(2026, 3, 15, 10) })]);
    const covered = new Set(albums.flatMap((a) => a.photoIds));
    expect(covered.has('solo')).toBe(true);
  });

  it('複数機種があり片方が閾値超え → device アルバム', () => {
    // 互いに十分離れた（連写扱いされない）pHash を割り当てる
    const ph = (i: number) =>
      ((Math.imul(i + 1, 2654435761) >>> 0).toString(16).padStart(8, '0')) +
      ((Math.imul(i + 1, 2246822519) >>> 0).toString(16).padStart(8, '0'));
    const feats = [
      ...Array.from({ length: 32 }, (_, i) =>
        feat(`canon-${i}`, { camera: { make: 'Canon', model: 'EOS R6' }, phash: ph(i), takenAt: T(2026, 2, 1 + (i % 20), 10, i) }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        feat(`apple-${i}`, { camera: { make: 'Apple', model: 'iPhone 15' }, phash: ph(100 + i), takenAt: T(2026, 2, 1, 12, i) }),
      ),
    ];
    const albums = buildAlbums(feats);
    expect(albums.some((a) => a.kind === 'device' && a.title.includes('EOS R6'))).toBe(true);
  });
});
