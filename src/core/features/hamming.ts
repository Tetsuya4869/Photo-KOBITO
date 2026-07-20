import { popcount32 } from '../util/distance';

/**
 * 16 文字 hex（64bit）2 つの Hamming 距離を返す。
 * 前 8 桁・後 8 桁をそれぞれ uint32 として XOR し popcount する。
 * near-duplicate は <=5、連写は <=10 が目安。
 */
export function hamming(a: string, b: string): number {
  if (a.length !== 16 || b.length !== 16) {
    // 長さが違う場合は最大距離扱い（比較不能）
    return 64;
  }
  const aHi = parseInt(a.slice(0, 8), 16) >>> 0;
  const aLo = parseInt(a.slice(8, 16), 16) >>> 0;
  const bHi = parseInt(b.slice(0, 8), 16) >>> 0;
  const bLo = parseInt(b.slice(8, 16), 16) >>> 0;
  return popcount32(aHi ^ bHi) + popcount32(aLo ^ bLo);
}
