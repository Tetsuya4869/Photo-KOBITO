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

describe('parseExif — 堅牢性（追加）', () => {
  it('リトルエンディアンのインライン SHORT（orientation/iso/pixel）と閏日', () => {
    const exif = parseExif(
      buildExifJpeg({
        byteOrder: 'II',
        orientation: 8,
        iso: 400,
        pixelWidth: 6000,
        pixelHeight: 4000,
        fNumber: [40, 10],
        focalLength: [50, 1],
        exposure: [1, 500],
        dateTimeOriginal: '2020:02:29 12:00:00',
      }),
    );
    expect(exif.orientation).toBe(8);
    expect(exif.iso).toBe(400);
    expect(exif.pixelWidth).toBe(6000);
    expect(exif.pixelHeight).toBe(4000);
    expect(exif.fNumber).toBeCloseTo(4.0, 2);
    expect(exif.takenAt).toBe(Date.UTC(2020, 1, 29, 12, 0, 0));
  });

  it('西経・南緯（MM）の符号', () => {
    const exif = parseExif(
      buildExifJpeg({
        byteOrder: 'MM',
        gps: { latRef: 'S', lat: [[10, 1], [0, 1], [0, 1]], lonRef: 'W', lon: [[122, 1], [25, 1], [0, 1]] },
      }),
    );
    expect(exif.gps!.lat).toBeCloseTo(-10, 5);
    expect(exif.gps!.lon).toBeCloseTo(-122.4167, 3);
  });

  it('ランダム/短小バッファでも throw しない（ファズ）', () => {
    for (let n = 0; n < 40; n++) {
      const arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) arr[i] = (i * 37 + n * 13) & 0xff;
      if (n >= 2) {
        arr[0] = 0xff;
        arr[1] = 0xd8;
      }
      expect(() => parseExif(arr.buffer)).not.toThrow();
    }
  });

  it('EXIF を任意の位置で切り詰めても throw しない（全カットオフ）', () => {
    const full = new Uint8Array(
      buildExifJpeg({
        byteOrder: 'MM',
        make: 'X',
        dateTimeOriginal: '2021:05:05 05:05:05',
        gps: { latRef: 'N', lat: [[1, 1], [2, 1], [3, 1]], lonRef: 'E', lon: [[4, 1], [5, 1], [6, 1]] },
      }),
    );
    for (let cut = 0; cut < full.length; cut++) {
      expect(() => parseExif(full.slice(0, cut).buffer)).not.toThrow();
    }
  });
});
