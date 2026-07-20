/**
 * テスト用の EXIF/JPEG バイト列ビルダ。
 *
 * 既知のフィールド値から本物の APP1(Exif)→TIFF→IFD 構造を持つ最小 JPEG を組み立てる。
 * これを parseExif に食わせて「元の値が復元されるか」を検証する（ラウンドトリップ）。
 * ビッグエンディアン(MM)・リトルエンディアン(II) 双方を出せるので両パスをテストできる。
 */

export type Endian = 'II' | 'MM';

export interface ExifJpegOpts {
  byteOrder?: Endian;
  make?: string;
  model?: string;
  orientation?: number;
  /** "YYYY:MM:DD HH:MM:SS" */
  dateTimeOriginal?: string;
  /** [numerator, denominator] */
  fNumber?: [number, number];
  iso?: number;
  focalLength?: [number, number];
  exposure?: [number, number];
  pixelWidth?: number;
  pixelHeight?: number;
  gps?: {
    latRef: 'N' | 'S';
    /** 度分秒それぞれ [num, den] */
    lat: [[number, number], [number, number], [number, number]];
    lonRef: 'E' | 'W';
    lon: [[number, number], [number, number], [number, number]];
  };
}

const T_ASCII = 2;
const T_SHORT = 3;
const T_LONG = 4;
const T_RATIONAL = 5;

interface RawEntry {
  tag: number;
  type: number;
  values: number[] | string;
}

function count(e: RawEntry): number {
  if (e.type === T_ASCII) return (e.values as string).length + 1;
  if (e.type === T_RATIONAL) return (e.values as number[]).length / 2;
  return (e.values as number[]).length;
}

function byteLen(e: RawEntry): number {
  const c = count(e);
  if (e.type === T_ASCII) return c;
  if (e.type === T_SHORT) return c * 2;
  if (e.type === T_LONG) return c * 4;
  if (e.type === T_RATIONAL) return c * 8;
  return c;
}

export function buildExifJpeg(opts: ExifJpegOpts): ArrayBuffer {
  const endian: Endian = opts.byteOrder ?? 'MM';
  const little = endian === 'II';

  // --- 各 IFD のエントリを構築（tag 昇順に並べる）---
  const exifEntries: RawEntry[] = [];
  if (opts.exposure) exifEntries.push({ tag: 0x829a, type: T_RATIONAL, values: opts.exposure });
  if (opts.fNumber) exifEntries.push({ tag: 0x829d, type: T_RATIONAL, values: opts.fNumber });
  if (opts.iso != null) exifEntries.push({ tag: 0x8827, type: T_SHORT, values: [opts.iso] });
  if (opts.dateTimeOriginal) exifEntries.push({ tag: 0x9003, type: T_ASCII, values: opts.dateTimeOriginal });
  if (opts.focalLength) exifEntries.push({ tag: 0x920a, type: T_RATIONAL, values: opts.focalLength });
  if (opts.pixelWidth != null) exifEntries.push({ tag: 0xa002, type: T_SHORT, values: [opts.pixelWidth] });
  if (opts.pixelHeight != null) exifEntries.push({ tag: 0xa003, type: T_SHORT, values: [opts.pixelHeight] });
  exifEntries.sort((a, b) => a.tag - b.tag);

  const gpsEntries: RawEntry[] = [];
  if (opts.gps) {
    gpsEntries.push({ tag: 0x0001, type: T_ASCII, values: opts.gps.latRef });
    gpsEntries.push({ tag: 0x0002, type: T_RATIONAL, values: opts.gps.lat.flat() });
    gpsEntries.push({ tag: 0x0003, type: T_ASCII, values: opts.gps.lonRef });
    gpsEntries.push({ tag: 0x0004, type: T_RATIONAL, values: opts.gps.lon.flat() });
  }

  const hasExif = exifEntries.length > 0;
  const hasGps = gpsEntries.length > 0;

  const ifd0Entries: RawEntry[] = [];
  if (opts.make) ifd0Entries.push({ tag: 0x010f, type: T_ASCII, values: opts.make });
  if (opts.model) ifd0Entries.push({ tag: 0x0110, type: T_ASCII, values: opts.model });
  if (opts.orientation != null) ifd0Entries.push({ tag: 0x0112, type: T_SHORT, values: [opts.orientation] });
  // ポインタは後で値を埋めるプレースホルダ
  const exifPtrEntry: RawEntry | null = hasExif ? { tag: 0x8769, type: T_LONG, values: [0] } : null;
  const gpsPtrEntry: RawEntry | null = hasGps ? { tag: 0x8825, type: T_LONG, values: [0] } : null;
  if (exifPtrEntry) ifd0Entries.push(exifPtrEntry);
  if (gpsPtrEntry) ifd0Entries.push(gpsPtrEntry);
  ifd0Entries.sort((a, b) => a.tag - b.tag);

  const ifdSize = (n: number) => 2 + 12 * n + 4;
  const ifd0Size = ifdSize(ifd0Entries.length);
  const exifSize = hasExif ? ifdSize(exifEntries.length) : 0;
  const gpsSize = hasGps ? ifdSize(gpsEntries.length) : 0;

  const ifd0Start = 8;
  const exifStart = ifd0Start + ifd0Size;
  const gpsStart = exifStart + exifSize;
  const dataStart = gpsStart + gpsSize;

  // ポインタ値を確定
  if (exifPtrEntry) exifPtrEntry.values = [exifStart];
  if (gpsPtrEntry) gpsPtrEntry.values = [gpsStart];

  // データプールのサイズを計算（インラインに入らない値のみ）
  let poolCursor = 0;
  const poolOffset = new Map<RawEntry, number>();
  const assignPool = (entries: RawEntry[]) => {
    for (const e of entries) {
      if (byteLen(e) > 4) {
        poolOffset.set(e, dataStart + poolCursor);
        let b = byteLen(e);
        if (b % 2 === 1) b += 1; // ワード境界
        poolCursor += b;
      }
    }
  };
  assignPool(ifd0Entries);
  if (hasExif) assignPool(exifEntries);
  if (hasGps) assignPool(gpsEntries);

  const tiffLen = dataStart + poolCursor;
  const buf = new ArrayBuffer(tiffLen);
  const view = new DataView(buf);

  // TIFF ヘッダ
  view.setUint16(0, little ? 0x4949 : 0x4d4d, false);
  view.setUint16(2, 42, little);
  view.setUint32(4, ifd0Start, little);

  const writeValue = (e: RawEntry, at: number) => {
    if (e.type === T_ASCII) {
      const s = e.values as string;
      for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
      view.setUint8(at + s.length, 0);
    } else if (e.type === T_SHORT) {
      const v = e.values as number[];
      for (let i = 0; i < v.length; i++) view.setUint16(at + i * 2, v[i], little);
    } else if (e.type === T_LONG) {
      const v = e.values as number[];
      for (let i = 0; i < v.length; i++) view.setUint32(at + i * 4, v[i], little);
    } else if (e.type === T_RATIONAL) {
      const v = e.values as number[];
      for (let i = 0; i < v.length / 2; i++) {
        view.setUint32(at + i * 8, v[i * 2], little);
        view.setUint32(at + i * 8 + 4, v[i * 2 + 1], little);
      }
    }
  };

  const writeIfd = (start: number, entries: RawEntry[]) => {
    view.setUint16(start, entries.length, little);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const eo = start + 2 + i * 12;
      view.setUint16(eo, e.tag, little);
      view.setUint16(eo + 2, e.type, little);
      view.setUint32(eo + 4, count(e), little);
      if (byteLen(e) <= 4) {
        writeValue(e, eo + 8);
      } else {
        const off = poolOffset.get(e)!;
        view.setUint32(eo + 8, off, little);
        writeValue(e, off);
      }
    }
    view.setUint32(start + 2 + entries.length * 12, 0, little); // next IFD = 0
  };

  writeIfd(ifd0Start, ifd0Entries);
  if (hasExif) writeIfd(exifStart, exifEntries);
  if (hasGps) writeIfd(gpsStart, gpsEntries);

  // JPEG ラッパ: SOI + APP1("Exif\0\0" + TIFF) + EOI
  const app1PayloadLen = 2 + 6 + tiffLen; // length(2) + "Exif\0\0"(6) + tiff
  const total = 2 + 2 + app1PayloadLen + 2;
  const out = new Uint8Array(total);
  let p = 0;
  out[p++] = 0xff;
  out[p++] = 0xd8; // SOI
  out[p++] = 0xff;
  out[p++] = 0xe1; // APP1
  out[p++] = (app1PayloadLen >> 8) & 0xff;
  out[p++] = app1PayloadLen & 0xff;
  out[p++] = 0x45; // E
  out[p++] = 0x78; // x
  out[p++] = 0x69; // i
  out[p++] = 0x66; // f
  out[p++] = 0x00;
  out[p++] = 0x00;
  out.set(new Uint8Array(buf), p);
  p += tiffLen;
  out[p++] = 0xff;
  out[p++] = 0xd9; // EOI
  return out.buffer;
}

/** よく使う既知サンプル。 */
export const SAMPLE_TOKYO_IPHONE: ExifJpegOpts = {
  byteOrder: 'MM',
  make: 'Apple',
  model: 'iPhone 15 Pro',
  orientation: 6,
  dateTimeOriginal: '2026:07:19 15:30:45',
  fNumber: [28, 10], // f/2.8
  iso: 100,
  focalLength: [24, 1],
  exposure: [1, 250],
  pixelWidth: 4032,
  pixelHeight: 3024,
  gps: {
    latRef: 'N',
    lat: [[35, 1], [40, 1], [3012, 100]], // 35°40'30.12" ≈ 35.675
    lonRef: 'E',
    lon: [[139, 1], [45, 1], [2580, 100]], // 139°45'25.80" ≈ 139.7572
  },
};

/** 西経・南半球（符号反転の検証用、リトルエンディアン）。 */
export const SAMPLE_SYDNEY_LITTLE: ExifJpegOpts = {
  byteOrder: 'II',
  make: 'Canon',
  model: 'Canon EOS R6',
  dateTimeOriginal: '2025:12:25 08:00:00',
  gps: {
    latRef: 'S',
    lat: [[33, 1], [51, 1], [3000, 100]], // -33.86
    lonRef: 'E',
    lon: [[151, 1], [12, 1], [3600, 100]], // 151.21
  },
};
