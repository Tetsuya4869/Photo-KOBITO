import { describe, it, expect } from 'vitest';
import { metadataOnlyFeature, seedFromString } from './imageFeature';
import { buildExifJpeg } from '../../test/fixtures/exif-samples';

describe('metadataOnlyFeature', () => {
  it('無効な null-island (0,0) GPS は棄却して gps=null（デコード済みと同じ検証）', () => {
    const bytes = buildExifJpeg({
      dateTimeOriginal: '2026:07:19 10:00:00',
      gps: { latRef: 'N', lat: [[0, 1], [0, 1], [0, 1]], lonRef: 'E', lon: [[0, 1], [0, 1], [0, 1]] },
    });
    const f = metadataOnlyFeature('p0', 'a.heic', 100, 0, bytes);
    expect(f.gps).toBeNull();
    // 日時は活かす
    expect(f.takenAt).toBe(Date.UTC(2026, 6, 19, 10, 0, 0));
    expect(f.takenAtSource).toBe('exif');
  });

  it('有効な GPS は保持する', () => {
    const bytes = buildExifJpeg({
      gps: { latRef: 'N', lat: [[35, 1], [0, 1], [0, 1]], lonRef: 'E', lon: [[139, 1], [0, 1], [0, 1]] },
    });
    const f = metadataOnlyFeature('p1', 'b.heic', 100, 0, bytes);
    expect(f.gps).not.toBeNull();
    expect(f.gps!.lat).toBeCloseTo(35, 5);
    expect(f.gps!.lon).toBeCloseTo(139, 5);
  });

  it('EXIF が無ければ lastModified を撮影時刻に使う', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
    const f = metadataOnlyFeature('p2', 'c.heic', 100, 1_700_000_000_000, png);
    expect(f.takenAt).toBe(1_700_000_000_000);
    expect(f.takenAtSource).toBe('mtime');
  });

  it('pHash は id 由来で決定的かつ写真ごとに一意（連写に誤結合させない）', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
    const a = metadataOnlyFeature('p0', 'x', 1, 0, png);
    const a2 = metadataOnlyFeature('p0', 'x', 1, 0, png);
    const b = metadataOnlyFeature('p1', 'y', 1, 0, png);
    expect(a.phash).toBe(a2.phash); // 決定的
    expect(a.phash).not.toBe(b.phash); // 一意
    expect(a.phash).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('seedFromString', () => {
  it('決定的で、異なる文字列は異なる seed', () => {
    expect(seedFromString('p0')).toBe(seedFromString('p0'));
    expect(seedFromString('p0')).not.toBe(seedFromString('p1'));
  });
});
