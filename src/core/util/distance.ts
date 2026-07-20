/** 汎用の数値ヘルパ。 */

/** 32bit 整数の立っているビット数（Hamming weight）。 */
export function popcount32(n: number): number {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  n = (n + (n >>> 4)) & 0x0f0f0f0f;
  return (Math.imul(n, 0x01010101) >>> 24) & 0xff;
}

/** 値を 0..1 に丸める。 */
export function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** 値を [lo, hi] に丸める。 */
export function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}
