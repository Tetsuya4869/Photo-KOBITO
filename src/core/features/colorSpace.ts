/** 色空間変換ヘルパ。すべて純粋・決定的。RGB は 0..255 を想定。 */

export interface Hsv {
  /** 0..360 */
  h: number;
  /** 0..1 */
  s: number;
  /** 0..1 */
  v: number;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

/** sRGB → CIELab (D65)。deltaE76 用。 */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB → linear
  const toLinear = (c: number) => {
    const cs = c / 255;
    return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  // linear RGB → XYZ (D65)
  let x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  let z = rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041;

  // 参照白 D65
  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return [L, a, bb];
}

/** CIE76 色差（ユークリッド距離）。 */
export function labDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

/** '#rrggbb' */
export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => {
    const v = Math.max(0, Math.min(255, Math.round(n)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${h(r)}${h(g)}${h(b)}`;
}
