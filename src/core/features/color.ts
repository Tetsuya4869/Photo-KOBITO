import type { DominantColor } from '../types';
import { rgbToHsv, rgbToLab, labDistance, rgbToHex } from './colorSpace';

export type Rgba = ArrayLike<number>;

/**
 * 支配色抽出。RGBA を CIELab に移し、seed 付き k-means（k=5, 最大10反復, 決定的初期化）で
 * クラスタリングして上位 3 色を hex + 面積比で返す。rng は必ず注入し決定性を担保する。
 */
export function dominantColors(
  rgba: Rgba,
  w: number,
  h: number,
  rng: () => number,
  k = 5,
  maxIter = 10,
): DominantColor[] {
  const n = w * h;
  if (n === 0) return [];

  const labs = new Float64Array(n * 3);
  const r8 = new Uint8Array(n);
  const g8 = new Uint8Array(n);
  const b8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    r8[i] = r;
    g8[i] = g;
    b8[i] = b;
    const lab = rgbToLab(r, g, b);
    labs[i * 3] = lab[0];
    labs[i * 3 + 1] = lab[1];
    labs[i * 3 + 2] = lab[2];
  }

  const kk = Math.min(k, n);
  // 決定的初期化: rng で重複しにくいよう間隔を空けて選ぶ
  const centroids = new Float64Array(kk * 3);
  const used = new Set<number>();
  for (let c = 0; c < kk; c++) {
    let idx = Math.floor(rng() * n);
    let guard = 0;
    while (used.has(idx) && guard < n) {
      idx = (idx + 1) % n;
      guard++;
    }
    used.add(idx);
    centroids[c * 3] = labs[idx * 3];
    centroids[c * 3 + 1] = labs[idx * 3 + 1];
    centroids[c * 3 + 2] = labs[idx * 3 + 2];
  }

  const assign = new Int32Array(n);
  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    // assignment
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      const p: [number, number, number] = [labs[i * 3], labs[i * 3 + 1], labs[i * 3 + 2]];
      for (let c = 0; c < kk; c++) {
        const d = labDistance(p, [centroids[c * 3], centroids[c * 3 + 1], centroids[c * 3 + 2]]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assign[i] !== best) {
        assign[i] = best;
        moved = true;
      }
    }
    // update
    const sumL = new Float64Array(kk);
    const sumA = new Float64Array(kk);
    const sumB = new Float64Array(kk);
    const cnt = new Int32Array(kk);
    for (let i = 0; i < n; i++) {
      const c = assign[i];
      sumL[c] += labs[i * 3];
      sumA[c] += labs[i * 3 + 1];
      sumB[c] += labs[i * 3 + 2];
      cnt[c]++;
    }
    for (let c = 0; c < kk; c++) {
      if (cnt[c] > 0) {
        centroids[c * 3] = sumL[c] / cnt[c];
        centroids[c * 3 + 1] = sumA[c] / cnt[c];
        centroids[c * 3 + 2] = sumB[c] / cnt[c];
      }
    }
    if (!moved && iter > 0) break;
  }

  // クラスタごとの平均 RGB と枚数を集計
  const cr = new Float64Array(kk);
  const cg = new Float64Array(kk);
  const cb = new Float64Array(kk);
  const count = new Int32Array(kk);
  for (let i = 0; i < n; i++) {
    const c = assign[i];
    cr[c] += r8[i];
    cg[c] += g8[i];
    cb[c] += b8[i];
    count[c]++;
  }

  const out: DominantColor[] = [];
  for (let c = 0; c < kk; c++) {
    if (count[c] === 0) continue;
    const r = cr[c] / count[c];
    const g = cg[c] / count[c];
    const b = cb[c] / count[c];
    out.push({
      hex: rgbToHex(r, g, b),
      lab: rgbToLab(r, g, b),
      weight: count[c] / n,
    });
  }
  out.sort((a, b) => b.weight - a.weight);
  return out.slice(0, 3);
}

export function meanSaturation(rgba: Rgba): number {
  const n = rgba.length / 4;
  if (n === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    s += rgbToHsv(rgba[o], rgba[o + 1], rgba[o + 2]).s;
  }
  return s / n;
}

/** Hasler–Süsstrunk colorfulness（生値, おおよそ 0..150）。 */
export function colorfulness(rgba: Rgba): number {
  const n = rgba.length / 4;
  if (n === 0) return 0;
  const rg = new Float64Array(n);
  const yb = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    rg[i] = r - g;
    yb[i] = 0.5 * (r + g) - b;
  }
  const stat = (arr: Float64Array) => {
    let m = 0;
    for (let i = 0; i < n; i++) m += arr[i];
    m /= n;
    let v = 0;
    for (let i = 0; i < n; i++) {
      const d = arr[i] - m;
      v += d * d;
    }
    return { mean: m, std: Math.sqrt(v / n) };
  };
  const sRg = stat(rg);
  const sYb = stat(yb);
  const stdRoot = Math.sqrt(sRg.std * sRg.std + sYb.std * sYb.std);
  const meanRoot = Math.sqrt(sRg.mean * sRg.mean + sYb.mean * sYb.mean);
  return stdRoot + 0.3 * meanRoot;
}

/** 画像上半分で「青空」らしい画素の割合 0..1。 */
export function blueTopRatio(rgba: Rgba, w: number, h: number): number {
  const halfH = Math.max(1, Math.floor(h / 2));
  let blue = 0;
  let total = 0;
  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const { h: hue, s, v } = rgbToHsv(rgba[o], rgba[o + 1], rgba[o + 2]);
      if (hue >= 190 && hue <= 250 && s > 0.2 && v > 0.4) blue++;
      total++;
    }
  }
  return total === 0 ? 0 : blue / total;
}

/** 「緑（植物）」らしい画素の割合 0..1。 */
export function greenRatio(rgba: Rgba): number {
  const n = rgba.length / 4;
  if (n === 0) return 0;
  let green = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const { h: hue, s, v } = rgbToHsv(rgba[o], rgba[o + 1], rgba[o + 2]);
    if (hue >= 70 && hue <= 160 && s > 0.25 && v > 0.15) green++;
  }
  return green / n;
}
