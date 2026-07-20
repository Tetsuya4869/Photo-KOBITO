/** スカラー画素統計。RGBA バッファ（長さ w*h*4, 各 0..255）を入力に取る。 */

export type Rgba = ArrayLike<number>;

/** 知覚輝度 0..1（Rec.709 係数）。 */
export function luma255(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** RGBA → グレースケール Float32Array（0..1 の知覚輝度）。 */
export function toGrayscale(rgba: Rgba, w: number, h: number): Float32Array {
  const n = w * h;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    out[i] = luma255(rgba[o], rgba[o + 1], rgba[o + 2]) / 255;
  }
  return out;
}

/** 平均知覚輝度 0..1。 */
export function brightness(rgba: Rgba): number {
  const n = rgba.length / 4;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    sum += luma255(rgba[o], rgba[o + 1], rgba[o + 2]);
  }
  return sum / n / 255;
}

/** 輝度の標準偏差 0..1（コントラスト指標）。 */
export function contrast(rgba: Rgba): number {
  const n = rgba.length / 4;
  if (n === 0) return 0;
  let sum = 0;
  const vals = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const l = luma255(rgba[o], rgba[o + 1], rgba[o + 2]) / 255;
    vals[i] = l;
    sum += l;
  }
  const mean = sum / n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = vals[i] - mean;
    variance += d * d;
  }
  return Math.sqrt(variance / n);
}

/** (meanR - meanB) / 255。暖色で正、寒色で負（-1..1）。 */
export function warmth(rgba: Rgba): number {
  const n = rgba.length / 4;
  if (n === 0) return 0;
  let sr = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    sr += rgba[o];
    sb += rgba[o + 2];
  }
  return (sr - sb) / n / 255;
}

/** 高輝度（白飛び気味）画素の割合 0..1。 */
export function highlightRatio(rgba: Rgba): number {
  const n = rgba.length / 4;
  if (n === 0) return 0;
  let c = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (luma255(rgba[o], rgba[o + 1], rgba[o + 2]) / 255 > 0.85) c++;
  }
  return c / n;
}

/**
 * 輝度の分散（0..~0.25）。全黒/全白のような一様フレームで極小になり、
 * pHash が縮退して誤って似ていると判定されるのを防ぐガードに使う。
 */
export function lumaVariance(rgba: Rgba): number {
  return contrast(rgba) ** 2;
}
