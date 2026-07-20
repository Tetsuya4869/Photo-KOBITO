import { describe, it, expect } from 'vitest';
import { titleForAlbum } from './titles';
import type { AlbumDraft } from '../types';

const base = (over: Partial<AlbumDraft>): AlbumDraft => ({
  kind: 'monthly',
  photoIds: ['a', 'b', 'c'],
  coverId: 'a',
  confidence: 'med',
  ...over,
});

describe('titleForAlbum', () => {
  it('trip（地名あり）', () => {
    const r = titleForAlbum(base({ kind: 'trip', tripNights: 2, place: { name: '京都', isHome: false, known: true }, dateRange: [1, 2] }));
    expect(r.title).toBe('京都、2泊3日の旅');
    expect(r.emoji).toBe('🚅');
  });

  it('trip（日帰り・地名なし）', () => {
    const r = titleForAlbum(base({ kind: 'trip', tripNights: 0, place: null }));
    expect(r.title).toBe('はじめての場所への旅');
    expect(r.emoji).toBe('🧭');
  });

  it('place（自宅）', () => {
    const r = titleForAlbum(base({ kind: 'place', place: { name: '', isHome: true, known: false } }));
    expect(r.title).toBe('いつもの場所');
    expect(r.emoji).toBe('🏠');
  });

  it('place（ランドマーク）', () => {
    const r = titleForAlbum(base({ kind: 'place', place: { name: '清水寺', isHome: false, known: true } }));
    expect(r.title).toBe('清水寺あたり');
  });

  it('day（祝日名）', () => {
    const ms = Date.UTC(2026, 0, 1, 10, 0);
    const r = titleForAlbum(base({ kind: 'day', dateRange: [ms, ms] }));
    expect(r.title).toBe('元日のおでかけ');
  });

  it('day（祝日でない日は日付）', () => {
    const ms = Date.UTC(2026, 6, 3, 10, 0); // 7月3日
    const r = titleForAlbum(base({ kind: 'day', dateRange: [ms, ms] }));
    expect(r.title).toBe('7月3日のおでかけ');
  });

  it('burst（連写）', () => {
    const r = titleForAlbum(base({ kind: 'burst', burstSubtype: 'burst', photoIds: ['a', 'b', 'c', 'd'] }));
    expect(r.title).toBe('そっくりさんフォト（4枚）');
    expect(r.emoji).toBe('👯');
  });

  it('burst（そっくり dup）', () => {
    const r = titleForAlbum(base({ kind: 'burst', burstSubtype: 'dup' }));
    expect(r.title).toBe('にたものコレクション');
  });

  it('scene（青空）', () => {
    const r = titleForAlbum(base({ kind: 'scene', sceneLabel: '青空' }));
    expect(r.title).toBe('青空コレクション');
    expect(r.emoji).toBe('☁️');
  });

  it('screenshot', () => {
    const r = titleForAlbum(base({ kind: 'screenshot' }));
    expect(r.title).toBe('スクショ整理');
  });

  it('device', () => {
    const r = titleForAlbum(base({ kind: 'device', deviceModel: 'iPhone 15 Pro' }));
    expect(r.title).toBe('iPhone 15 Proで撮った写真');
  });

  it('monthly（月あり／なし）', () => {
    expect(titleForAlbum(base({ kind: 'monthly', monthKey: { year: 2026, month: 7 } })).title).toBe('2026年7月のこと');
    expect(titleForAlbum(base({ kind: 'monthly' })).title).toBe('いつかの写真たち');
  });

  it('必ず reason が付く', () => {
    const r = titleForAlbum(base({ kind: 'trip', tripNights: 1, place: { name: '沖縄', isHome: false, known: true }, dateRange: [1, 2] }));
    expect(r.reason.length).toBeGreaterThan(0);
  });
});
