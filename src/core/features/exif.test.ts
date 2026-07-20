import { describe, it, expect } from 'vitest';
import { parseExif, dmsToDecimal } from './exif';
import {
  buildExifJpeg,
  SAMPLE_TOKYO_IPHONE,
  SAMPLE_SYDNEY_LITTLE,
} from '../../../test/fixtures/exif-samples';

describe('dmsToDecimal', () => {
  it('北緯・東経はそのまま正の十進度', () => {
    expect(dmsToDecimal(35, 40, 30.12, 'N')).toBeCloseTo(35.6750, 4);
    expect(dmsToDecimal(139, 45, 25.8, 'E')).toBeCloseTo(139.7572, 4);
  });
  it('南緯 (S) / 西経 (W) は符号反転', () => {
    expect(dmsToDecimal(33, 51, 30, 'S')).toBeCloseTo(-33.8583, 4);
    expect(dmsToDecimal(122, 25, 0, 'W')).toBeCloseTo(-122.4167, 4);
  });
  it('参照の大文字小文字・空白を許容', () => {
    expect(dmsToDecimal(10, 0, 0, ' s ')).toBeCloseTo(-10, 6);
  });
});

describe('parseExif — ビッグエンディアン(MM) フルサンプル', () => {
  const exif = parseExif(buildExifJpeg(SAMPLE_TOKYO_IPHONE));

  it('カメラ情報を復元', () => {
    expect(exif.make).toBe('Apple');
    expect(exif.model).toBe('iPhone 15 Pro');
    expect(exif.orientation).toBe(6);
    expect(exif.fNumber).toBeCloseTo(2.8, 2);
    expect(exif.iso).toBe(100);
    expect(exif.focalLength).toBeCloseTo(24, 2);
    expect(exif.exposure).toBeCloseTo(1 / 250, 6);
    expect(exif.pixelWidth).toBe(4032);
    expect(exif.pixelHeight).toBe(3024);
  });

  it('DateTimeOriginal を壁時計=UTC の epoch ms に変換（TZ非依存）', () => {
    expect(exif.takenAt).toBe(Date.UTC(2026, 6, 19, 15, 30, 45));
  });

  it('GPS を十進度に変換', () => {
    expect(exif.gps).not.toBeNull();
    expect(exif.gps!.lat).toBeCloseTo(35.675, 3);
    expect(exif.gps!.lon).toBeCloseTo(139.7572, 3);
  });
});

describe('parseExif — リトルエンディアン(II) / 南半球', () => {
  const exif = parseExif(buildExifJpeg(SAMPLE_SYDNEY_LITTLE));

  it('II バイトオーダを正しく解釈', () => {
    expect(exif.make).toBe('Canon');
    expect(exif.model).toBe('Canon EOS R6');
  });

  it('南緯は負値', () => {
    expect(exif.gps!.lat).toBeCloseTo(-33.86, 2);
    expect(exif.gps!.lon).toBeCloseTo(151.21, 2);
  });
});

describe('parseExif — 欠落・異常系', () => {
  it('JPEG でないバイト列は空の ExifData', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]).buffer;
    const exif = parseExif(png);
    expect(exif.takenAt).toBeNull();
    expect(exif.gps).toBeNull();
    expect(exif.make).toBeUndefined();
  });

  it('短すぎるバッファでも throw しない', () => {
    expect(() => parseExif(new Uint8Array([0xff]).buffer)).not.toThrow();
  });

  it('日時が無い場合 takenAt は null、GPS のみでも取れる', () => {
    const exif = parseExif(
      buildExifJpeg({
        gps: {
          latRef: 'N',
          lat: [[10, 1], [0, 1], [0, 1]],
          lonRef: 'E',
          lon: [[20, 1], [0, 1], [0, 1]],
        },
      }),
    );
    expect(exif.takenAt).toBeNull();
    expect(exif.gps!.lat).toBeCloseTo(10, 5);
    expect(exif.gps!.lon).toBeCloseTo(20, 5);
  });

  it('"0000:00:00 00:00:00" のような無効日時は null', () => {
    const exif = parseExif(buildExifJpeg({ dateTimeOriginal: '0000:00:00 00:00:00' }));
    expect(exif.takenAt).toBeNull();
  });

  it('GPS 無し（スクショ相当）は gps=null で他は取れる', () => {
    const exif = parseExif(buildExifJpeg({ make: 'Google', dateTimeOriginal: '2026:01:02 03:04:05' }));
    expect(exif.gps).toBeNull();
    expect(exif.make).toBe('Google');
    expect(exif.takenAt).toBe(Date.UTC(2026, 0, 2, 3, 4, 5));
  });
});
