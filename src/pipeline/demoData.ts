import type { DominantColor, PhotoFeature } from '../core/types';
import { mulberry32 } from '../core/util/seededRandom';
import { rgbToLab } from '../core/features/colorSpace';

/**
 * seed 固定の合成 PhotoFeature 群（〜114枚）。
 * デモモード・ゴールデンテスト・開発時の UI 確認の三役を兼ねる。
 * 実画像ファイルを介さず buildAlbums に直接流せるよう、手続き生成のグラデ data-URI
 * サムネ(coverThumb) を各枚に持たせている。
 *
 * 含まれるシナリオ:
 *  - 沖縄 2泊3日の旅（42枚, 遠方 GPS・連続日）
 *  - おうちごはん（15枚, 暖色・高彩度・自宅 GPS）
 *  - 犬の連写（12枚, pHash 近接・0.4秒間隔）
 *  - スクショ群（18枚, カメラ無し・高エッジ・高明度・低彩度）
 *  - 夜景（8枚, 低輝度・高ISO）
 *  - 青空（10枚, 上部青・低エッジ）
 *  - モノクロ（6枚, 低彩度・カメラ有り）
 *  - 取りこぼし（3枚, 月次回収へ）
 */

const HOME = { lat: 35.646, lon: 139.653 }; // 東京・自宅想定
const OKINAWA = { lat: 26.212, lon: 127.681 };

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function dc(hex: string, weight: number): DominantColor {
  const [r, g, b] = hexToRgb(hex);
  return { hex, lab: rgbToLab(r, g, b), weight };
}

function thumb(a: string, b: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/>` +
    `</linearGradient></defs><rect width='16' height='16' fill='url(#g)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const T = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
  Date.UTC(y, mo - 1, d, h, mi, s);

const APPLE = { make: 'Apple', model: 'iPhone 15 Pro', fNumber: 1.8, iso: 100, focalLength: 24, exposure: 0.004 };

interface Overrides {
  colors: DominantColor[];
  brightness: number;
  saturation: number;
  contrast: number;
  edgeDensity: number;
  warmth: number;
  colorfulness: number;
  blueTopRatio?: number;
  greenRatio?: number;
  lumaVariance?: number;
  aspect?: number;
  takenAt?: number | null;
  gps?: { lat: number; lon: number } | null;
  camera?: PhotoFeature['camera'];
  name?: string;
  phash?: string;
  thumbA?: string;
  thumbB?: string;
}

export function makeDemoFeatures(seed = 42): PhotoFeature[] {
  const rng = mulberry32(seed);
  const randU32 = () => Math.floor(rng() * 0x100000000) >>> 0;
  const randHash = () =>
    randU32().toString(16).padStart(8, '0') + randU32().toString(16).padStart(8, '0');
  const flipHash = (hex: string, nbits: number) => {
    let hi = parseInt(hex.slice(0, 8), 16) >>> 0;
    let lo = parseInt(hex.slice(8), 16) >>> 0;
    for (let i = 0; i < nbits; i++) {
      const bit = Math.floor(rng() * 64);
      if (bit < 32) hi = (hi ^ (1 << bit)) >>> 0;
      else lo = (lo ^ (1 << (bit - 32))) >>> 0;
    }
    return hi.toString(16).padStart(8, '0') + lo.toString(16).padStart(8, '0');
  };

  const out: PhotoFeature[] = [];
  let counter = 0;
  const mk = (o: Overrides): PhotoFeature => {
    const id = `demo-${String(counter).padStart(3, '0')}`;
    counter++;
    const colors = o.colors;
    return {
      id,
      name: o.name ?? `IMG_${1000 + counter}.jpg`,
      sizeBytes: 1_800_000 + Math.floor(rng() * 800_000),
      width: 4032,
      height: 3024,
      aspect: o.aspect ?? 4032 / 3024,
      takenAt: o.takenAt === undefined ? null : o.takenAt,
      takenAtSource: 'exif',
      gps: o.gps === undefined ? null : o.gps,
      camera: o.camera === undefined ? { ...APPLE } : o.camera,
      phash: o.phash ?? randHash(),
      colors,
      brightness: o.brightness,
      saturation: o.saturation,
      contrast: o.contrast,
      edgeDensity: o.edgeDensity,
      warmth: o.warmth,
      colorfulness: o.colorfulness,
      blueTopRatio: o.blueTopRatio ?? 0,
      greenRatio: o.greenRatio ?? 0,
      lumaVariance: o.lumaVariance ?? Math.max(0.01, o.contrast * o.contrast),
      coverThumb: thumb(o.thumbA ?? colors[0].hex, o.thumbB ?? colors[colors.length - 1].hex),
    };
  };

  // --- 沖縄 2泊3日の旅（42枚）---
  const beach: Overrides = {
    colors: [dc('#4aa6d6', 0.5), dc('#f2e2b8', 0.3), dc('#2e6f9e', 0.2)],
    brightness: 0.66, saturation: 0.42, contrast: 0.22, edgeDensity: 0.1,
    warmth: 0.02, colorfulness: 55, blueTopRatio: 0.55, greenRatio: 0.05,
  };
  const okinawaDays: Array<[number, number, number]> = [
    [2026, 7, 10],
    [2026, 7, 11],
    [2026, 7, 12],
  ];
  for (let d = 0; d < okinawaDays.length; d++) {
    const [y, mo, day] = okinawaDays[d];
    const per = 14;
    for (let i = 0; i < per; i++) {
      const hour = 9 + Math.floor((i / per) * 8); // 9:00〜17:00
      const min = (i * 17) % 60;
      const jitterLat = (rng() - 0.5) * 0.02;
      const jitterLon = (rng() - 0.5) * 0.02;
      const blueSky = i % 3 === 0;
      out.push(
        mk({
          ...beach,
          blueTopRatio: blueSky ? 0.6 : 0.35,
          brightness: blueSky ? 0.7 : 0.6,
          edgeDensity: blueSky ? 0.08 : 0.14,
          takenAt: T(y, mo, day, hour, min, (i * 7) % 60),
          gps: { lat: OKINAWA.lat + jitterLat, lon: OKINAWA.lon + jitterLon },
          name: `IMG_okinawa_${d}_${i}.jpg`,
          thumbA: '#7fc3e8',
          thumbB: '#f4e6bd',
        }),
      );
    }
  }

  // --- おうちごはん（15枚, 暖色・高彩度・自宅 GPS）---
  const foodDays = [
    T(2026, 6, 3, 19, 0),
    T(2026, 6, 7, 20, 0),
    T(2026, 6, 14, 19, 30),
    T(2026, 6, 20, 20, 15),
    T(2026, 6, 25, 19, 45),
  ];
  for (let g = 0; g < foodDays.length; g++) {
    for (let i = 0; i < 3; i++) {
      out.push(
        mk({
          colors: [dc('#c85a2b', 0.45), dc('#e8b06a', 0.35), dc('#7a3b1e', 0.2)],
          brightness: 0.52, saturation: 0.55, contrast: 0.2, edgeDensity: 0.22,
          warmth: 0.2, colorfulness: 62,
          takenAt: foodDays[g] + i * 90_000,
          gps: { lat: HOME.lat + (rng() - 0.5) * 0.001, lon: HOME.lon + (rng() - 0.5) * 0.001 },
          name: `IMG_dinner_${g}_${i}.jpg`,
          aspect: 1,
          thumbA: '#e07a3c',
          thumbB: '#f2c98a',
        }),
      );
    }
  }

  // --- 犬の連写（12枚, pHash 近接・0.4秒間隔）---
  const dogBase = randHash();
  const dogStart = T(2026, 7, 5, 16, 0, 0);
  for (let i = 0; i < 12; i++) {
    out.push(
      mk({
        colors: [dc('#b98a5e', 0.5), dc('#e5d3b3', 0.3), dc('#5a4630', 0.2)],
        brightness: 0.5, saturation: 0.35, contrast: 0.25, edgeDensity: 0.3,
        warmth: 0.12, colorfulness: 38, aspect: 3024 / 4032,
        takenAt: dogStart + Math.round(i * 400),
        gps: { lat: HOME.lat + 0.0004, lon: HOME.lon + 0.0004 },
        camera: { ...APPLE, fNumber: 1.8 },
        name: `IMG_dog_${i}.jpg`,
        phash: flipHash(dogBase, i === 0 ? 0 : 1 + (i % 3)),
        thumbA: '#c99a6a',
        thumbB: '#efe0c4',
      }),
    );
  }

  // --- スクショ群（18枚, カメラ無し・高エッジ・高明度・低彩度）---
  for (let i = 0; i < 18; i++) {
    const day = 1 + i;
    out.push(
      mk({
        colors: [dc('#f4f5f7', 0.7), dc('#d8dbe0', 0.2), dc('#3a7afe', 0.1)],
        brightness: 0.9, saturation: 0.12, contrast: 0.28, edgeDensity: 0.45,
        warmth: 0, colorfulness: 18,
        takenAt: T(2026, 7, day, 12, (i * 13) % 60),
        gps: null,
        camera: null,
        aspect: 1179 / 2556,
        name: `Screenshot_2026-07-${String(day).padStart(2, '0')}.png`,
        thumbA: '#f7f8fa',
        thumbB: '#c9ccd3',
      }),
    );
  }

  // --- 夜景（8枚, 低輝度・高ISO, 2晩に分けて単日イベント化を避ける）---
  const nightDays: Array<[number, number, number]> = [
    [2026, 7, 8],
    [2026, 7, 15],
  ];
  for (let d = 0; d < nightDays.length; d++) {
    const [y, mo, day] = nightDays[d];
    for (let i = 0; i < 4; i++) {
      out.push(
        mk({
          colors: [dc('#141a2e', 0.55), dc('#c9a24a', 0.25), dc('#3a3f5c', 0.2)],
          brightness: 0.16, saturation: 0.4, contrast: 0.22, edgeDensity: 0.2,
          warmth: 0.05, colorfulness: 45, lumaVariance: 0.05,
          takenAt: T(y, mo, day, 20, i * 6),
          gps: { lat: HOME.lat + 0.01, lon: HOME.lon + 0.01 },
          camera: { ...APPLE, iso: 2500, exposure: 0.05 },
          name: `IMG_night_${d}_${i}.jpg`,
          thumbA: '#1b2340',
          thumbB: '#c9a24a',
        }),
      );
    }
  }

  // --- 日帰りおでかけ（7枚, 同日・自宅から離れた無名の場所 → 「その日」アルバム）---
  const outingStart = T(2026, 6, 13, 10, 0);
  for (let i = 0; i < 7; i++) {
    out.push(
      mk({
        colors: [dc('#7d9b64', 0.45), dc('#c8cdbb', 0.3), dc('#4a5a3a', 0.25)],
        brightness: 0.55, saturation: 0.28, contrast: 0.24, edgeDensity: 0.2,
        warmth: 0.03, colorfulness: 30, greenRatio: 0.2,
        takenAt: outingStart + i * 50 * 60_000,
        gps: { lat: 35.55 + (rng() - 0.5) * 0.004, lon: 139.35 + (rng() - 0.5) * 0.004 },
        name: `IMG_outing_${i}.jpg`,
        thumbA: '#8aa66f',
        thumbB: '#cdd2c0',
      }),
    );
  }

  // --- 青空（10枚, 5月の別々の日）---
  for (let i = 0; i < 10; i++) {
    const day = 2 + i * 2;
    out.push(
      mk({
        colors: [dc('#5aa9e6', 0.6), dc('#eef4fb', 0.25), dc('#2f7cc0', 0.15)],
        brightness: 0.72, saturation: 0.38, contrast: 0.14, edgeDensity: 0.08,
        warmth: -0.05, colorfulness: 40, blueTopRatio: 0.62,
        takenAt: T(2026, 5, day, 11, (i * 7) % 60),
        gps: { lat: HOME.lat + 0.02, lon: HOME.lon - 0.02 },
        name: `IMG_sky_${i}.jpg`,
        aspect: 4032 / 3024,
        thumbA: '#6fb4ea',
        thumbB: '#eef4fb',
      }),
    );
  }

  // --- モノクロ（6枚, 4月）---
  for (let i = 0; i < 6; i++) {
    const day = 3 + i * 3;
    const v = 90 + i * 15;
    const hex = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
    out.push(
      mk({
        colors: [dc(hex, 0.6), dc('#20242c', 0.25), dc('#c9ccd1', 0.15)],
        brightness: 0.45, saturation: 0.05, contrast: 0.3, edgeDensity: 0.28,
        warmth: 0, colorfulness: 6,
        takenAt: T(2026, 4, day, 15, (i * 11) % 60),
        gps: null,
        camera: { ...APPLE, model: 'iPhone 15 Pro' },
        name: `IMG_mono_${i}.jpg`,
        thumbA: '#8a8d92',
        thumbB: '#2a2e36',
      }),
    );
  }

  // --- 取りこぼし（3枚: 2枚は日時不明, 1枚は3月の孤立）---
  out.push(
    mk({
      colors: [dc('#8a9a7b', 0.6), dc('#d8d2c0', 0.4)],
      brightness: 0.5, saturation: 0.25, contrast: 0.2, edgeDensity: 0.2,
      warmth: 0.02, colorfulness: 28,
      takenAt: null,
      gps: null,
      camera: null,
      name: 'unknown_a.jpg',
      thumbA: '#9aa88b',
      thumbB: '#e0dccb',
    }),
  );
  out.push(
    mk({
      colors: [dc('#6b7b8a', 0.6), dc('#c0c8d0', 0.4)],
      brightness: 0.48, saturation: 0.22, contrast: 0.2, edgeDensity: 0.2,
      warmth: -0.02, colorfulness: 24,
      takenAt: null,
      gps: null,
      camera: null,
      name: 'unknown_b.jpg',
      thumbA: '#7d8b98',
      thumbB: '#cdd4dc',
    }),
  );
  out.push(
    mk({
      colors: [dc('#a67b8a', 0.6), dc('#e0cdd4', 0.4)],
      brightness: 0.55, saturation: 0.3, contrast: 0.18, edgeDensity: 0.18,
      warmth: 0.06, colorfulness: 30,
      takenAt: T(2026, 3, 15, 14, 0),
      gps: { lat: HOME.lat, lon: HOME.lon },
      name: 'IMG_march.jpg',
      thumbA: '#b78d9a',
      thumbB: '#e8d9df',
    }),
  );

  return out;
}
