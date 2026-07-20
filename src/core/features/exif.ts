import type { ExifData, LatLng } from '../types';

/**
 * 純関数の EXIF パーサ。JPEG の APP1(Exif) → TIFF ヘッダ → IFD0 / ExifIFD / GPSIFD を辿り、
 * 撮影時刻・GPS・カメラ情報を取り出す。バイト列 in → プレーンオブジェクト out なので
 * DOM 非依存で完全にテストできる。壊れた/EXIF 無しの入力では空の ExifData を返し、決して throw しない。
 */

const EMPTY = (): ExifData => ({ takenAt: null, gps: null });

/** 度分秒 + 方位参照 → 十進度。南半球 (S) / 西経 (W) は負。 */
export function dmsToDecimal(d: number, m: number, s: number, ref: string): number {
  let dec = d + m / 60 + s / 3600;
  const r = (ref || '').trim().toUpperCase();
  if (r === 'S' || r === 'W') dec = -dec;
  return dec;
}

/** EXIF 型ごとの 1 要素あたりバイト数。 */
function typeSize(type: number): number {
  switch (type) {
    case 1: // BYTE
    case 2: // ASCII
    case 6: // SBYTE
    case 7: // UNDEFINED
      return 1;
    case 3: // SHORT
    case 8: // SSHORT
      return 2;
    case 4: // LONG
    case 9: // SLONG
    case 11: // FLOAT
      return 4;
    case 5: // RATIONAL
    case 10: // SRATIONAL
    case 12: // DOUBLE
      return 8;
    default:
      return 1;
  }
}

interface Entry {
  type: number;
  count: number;
  /** 値本体（またはインラインバイト）が始まる絶対オフセット。 */
  valueOffset: number;
}

interface Ifd {
  entries: Map<number, Entry>;
}

/**
 * 1 つの IFD を読む。tiffStart は TIFF ヘッダ先頭の絶対オフセット、ifdOffset は
 * tiffStart からの相対オフセット。
 */
function readIfd(view: DataView, tiffStart: number, ifdOffset: number, little: boolean): Ifd | null {
  const base = tiffStart + ifdOffset;
  if (base + 2 > view.byteLength) return null;
  const count = view.getUint16(base, little);
  if (count > 4096) return null; // 明らかに壊れている
  const entries = new Map<number, Entry>();
  for (let i = 0; i < count; i++) {
    const e = base + 2 + i * 12;
    if (e + 12 > view.byteLength) break;
    const tag = view.getUint16(e, little);
    const type = view.getUint16(e + 2, little);
    const cnt = view.getUint32(e + 4, little);
    const bytes = typeSize(type) * cnt;
    let valueOffset: number;
    if (bytes <= 4) {
      valueOffset = e + 8; // インライン
    } else {
      valueOffset = tiffStart + view.getUint32(e + 8, little);
    }
    if (valueOffset < 0 || valueOffset > view.byteLength) continue;
    entries.set(tag, { type, count: cnt, valueOffset });
  }
  return { entries };
}

function readAscii(view: DataView, entry: Entry): string | undefined {
  const end = Math.min(entry.valueOffset + entry.count, view.byteLength);
  let s = '';
  for (let i = entry.valueOffset; i < end; i++) {
    const c = view.getUint8(i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  s = s.trim();
  return s.length ? s : undefined;
}

/** SHORT / LONG のインデックス i の整数値を読む。 */
function readInt(view: DataView, entry: Entry, i: number, little: boolean): number | undefined {
  const size = typeSize(entry.type);
  const at = entry.valueOffset + i * size;
  if (at + size > view.byteLength) return undefined;
  if (entry.type === 3) return view.getUint16(at, little);
  if (entry.type === 4) return view.getUint32(at, little);
  if (entry.type === 8) return view.getInt16(at, little);
  if (entry.type === 9) return view.getInt32(at, little);
  if (entry.type === 1 || entry.type === 7) return view.getUint8(at);
  return undefined;
}

/** RATIONAL / SRATIONAL のインデックス i を小数として読む。 */
function readRational(view: DataView, entry: Entry, i: number, little: boolean): number | undefined {
  const at = entry.valueOffset + i * 8;
  if (at + 8 > view.byteLength) return undefined;
  const signed = entry.type === 10;
  const num = signed ? view.getInt32(at, little) : view.getUint32(at, little);
  const den = signed ? view.getInt32(at + 4, little) : view.getUint32(at + 4, little);
  if (den === 0) return 0;
  return num / den;
}

/** SHORT/LONG/RATIONAL いずれでも「最初の数値」を読む。 */
function readNumber(view: DataView, entry: Entry, little: boolean): number | undefined {
  if (entry.type === 5 || entry.type === 10) return readRational(view, entry, 0, little);
  return readInt(view, entry, 0, little);
}

/** "YYYY:MM:DD HH:MM:SS" を「壁時計をUTCとみなした」epoch ms に変換。TZ非依存で決定的。 */
function parseExifDate(s: string | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s.trim());
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const h = +m[4];
  const mi = +m[5];
  const se = +m[6];
  // "0000:00:00" などの無効値
  if (y === 0 || mo === 0 || d === 0) return null;
  const t = Date.UTC(y, mo - 1, d, h, mi, se);
  return Number.isFinite(t) ? t : null;
}

function readGps(view: DataView, gps: Ifd, little: boolean): LatLng | null {
  const latRefE = gps.entries.get(0x0001);
  const latE = gps.entries.get(0x0002);
  const lonRefE = gps.entries.get(0x0003);
  const lonE = gps.entries.get(0x0004);
  if (!latE || !lonE) return null;
  const latRef = latRefE ? readAscii(view, latRefE) ?? 'N' : 'N';
  const lonRef = lonRefE ? readAscii(view, lonRefE) ?? 'E' : 'E';
  const ld = readRational(view, latE, 0, little);
  const lm = readRational(view, latE, 1, little);
  const ls = readRational(view, latE, 2, little);
  const od = readRational(view, lonE, 0, little);
  const om = readRational(view, lonE, 1, little);
  const os = readRational(view, lonE, 2, little);
  if (ld == null || lm == null || ls == null || od == null || om == null || os == null) return null;
  const lat = dmsToDecimal(ld, lm, ls, latRef);
  const lon = dmsToDecimal(od, om, os, lonRef);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function parseTiff(view: DataView, tiffStart: number): ExifData {
  if (tiffStart + 8 > view.byteLength) return EMPTY();
  const byteOrder = view.getUint16(tiffStart, false);
  let little: boolean;
  if (byteOrder === 0x4949) little = true; // "II"
  else if (byteOrder === 0x4d4d) little = false; // "MM"
  else return EMPTY();
  const magic = view.getUint16(tiffStart + 2, little);
  if (magic !== 42) return EMPTY();
  const ifd0Offset = view.getUint32(tiffStart + 4, little);

  const out: ExifData = EMPTY();
  const ifd0 = readIfd(view, tiffStart, ifd0Offset, little);
  if (!ifd0) return out;

  const make = ifd0.entries.get(0x010f);
  if (make) out.make = readAscii(view, make);
  const model = ifd0.entries.get(0x0110);
  if (model) out.model = readAscii(view, model);
  const orient = ifd0.entries.get(0x0112);
  if (orient) out.orientation = readInt(view, orient, 0, little);

  // ExifIFD
  const exifPtr = ifd0.entries.get(0x8769);
  if (exifPtr) {
    const off = readInt(view, exifPtr, 0, little);
    if (off != null) {
      const exifIfd = readIfd(view, tiffStart, off, little);
      if (exifIfd) {
        const dto = exifIfd.entries.get(0x9003) ?? exifIfd.entries.get(0x9004); // DateTimeOriginal / Digitized
        out.takenAt = parseExifDate(dto ? readAscii(view, dto) : undefined);
        const fn = exifIfd.entries.get(0x829d);
        if (fn) out.fNumber = round2(readRational(view, fn, 0, little));
        const iso = exifIfd.entries.get(0x8827);
        if (iso) out.iso = readInt(view, iso, 0, little);
        const fl = exifIfd.entries.get(0x920a);
        if (fl) out.focalLength = round2(readRational(view, fl, 0, little));
        const exp = exifIfd.entries.get(0x829a);
        if (exp) out.exposure = readRational(view, exp, 0, little);
        const pw = exifIfd.entries.get(0xa002);
        if (pw) out.pixelWidth = readNumber(view, pw, little);
        const ph = exifIfd.entries.get(0xa003);
        if (ph) out.pixelHeight = readNumber(view, ph, little);
      }
    }
  }

  // GPS IFD
  const gpsPtr = ifd0.entries.get(0x8825);
  if (gpsPtr) {
    const off = readInt(view, gpsPtr, 0, little);
    if (off != null) {
      const gpsIfd = readIfd(view, tiffStart, off, little);
      if (gpsIfd) out.gps = readGps(view, gpsIfd, little);
    }
  }

  return out;
}

function round2(x: number | undefined): number | undefined {
  if (x == null || !Number.isFinite(x)) return undefined;
  return Math.round(x * 100) / 100;
}

/**
 * JPEG バイト列から EXIF を抽出する。APP1(Exif) セグメントを探し TIFF を解析する。
 * JPEG でない/EXIF が無い場合は空の ExifData を返す。
 */
export function parseExif(bytes: ArrayBuffer): ExifData {
  const view = new DataView(bytes);
  const len = view.byteLength;
  if (len < 4) return EMPTY();
  if (view.getUint16(0, false) !== 0xffd8) return EMPTY(); // SOI

  let offset = 2;
  while (offset + 4 <= len) {
    if (view.getUint8(offset) !== 0xff) {
      offset++; // マーカ境界の再同期
      continue;
    }
    const marker = view.getUint8(offset + 1);
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS 以降は画像データ
    // 長さを持たないスタンドアロンマーカ
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (offset + 4 > len) break;
    const segLen = view.getUint16(offset + 2, false);
    if (segLen < 2) break;
    if (marker === 0xe1) {
      const p = offset + 4;
      if (
        p + 6 <= len &&
        view.getUint8(p) === 0x45 && // E
        view.getUint8(p + 1) === 0x78 && // x
        view.getUint8(p + 2) === 0x69 && // i
        view.getUint8(p + 3) === 0x66 && // f
        view.getUint8(p + 4) === 0x00 &&
        view.getUint8(p + 5) === 0x00
      ) {
        return parseTiff(view, p + 6);
      }
    }
    offset += 2 + segLen;
  }
  return EMPTY();
}
