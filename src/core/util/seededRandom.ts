/**
 * mulberry32: 32bit のシード付き擬似乱数生成器。
 *
 * コアからは Date.now() / Math.random() を排除し、乱数が必要な箇所（k-means の
 * 初期化やデモデータ生成）は必ずこの決定的な生成器を注入する。これにより
 * 「同じ入力 → 同じアルバム」が保証され、スナップショットテストが安定する。
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [min, max) の整数を返すヘルパ。 */
export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min));
}
