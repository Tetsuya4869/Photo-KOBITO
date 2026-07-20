/**
 * 知覚ハッシュ（pHash）。32x32 グレースケール → 2D DCT → 左上 8x8 低周波 →
 * 中央値しきい値で 64bit → 16 文字 hex に符号化する。
 *
 * hex 文字列で保持することで BigInt/float の非決定性を避け、スナップショット比較や
 * IndexedDB シリアライズが安定する。DCT は分離型（行→列）で高速化。
 */

const N = 32;
const BLOCK = 8;

// COS[u * N + x] = cos((2x+1) * u * π / (2N)) を一度だけ計算。
const COS = (() => {
  const t = new Float64Array(N * N);
  for (let u = 0; u < N; u++) {
    for (let x = 0; x < N; x++) {
      t[u * N + x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
    }
  }
  return t;
})();

/** 任意サイズのグレースケールを tw x th にボックス平均でリサンプル。 */
export function resampleGray(
  gray: ArrayLike<number>,
  w: number,
  h: number,
  tw: number,
  th: number,
): Float32Array {
  const out = new Float32Array(tw * th);
  if (w === tw && h === th) {
    for (let i = 0; i < out.length; i++) out[i] = gray[i];
    return out;
  }
  for (let ty = 0; ty < th; ty++) {
    const sy0 = Math.floor((ty * h) / th);
    const sy1 = Math.max(sy0 + 1, Math.floor(((ty + 1) * h) / th));
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = Math.floor((tx * w) / tw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((tx + 1) * w) / tw));
      let sum = 0;
      let cnt = 0;
      for (let sy = sy0; sy < sy1 && sy < h; sy++) {
        for (let sx = sx0; sx < sx1 && sx < w; sx++) {
          sum += gray[sy * w + sx];
          cnt++;
        }
      }
      out[ty * tw + tx] = cnt ? sum / cnt : 0;
    }
  }
  return out;
}

/** 32x32 グレースケールの分離型 2D DCT-II を計算し、左上 8x8 を返す（row-major, 長さ64）。 */
function dct8x8(gray32: Float32Array): Float64Array {
  // 行方向 DCT: tmp[y*N + u]
  const tmp = new Float64Array(N * N);
  for (let y = 0; y < N; y++) {
    const row = y * N;
    for (let u = 0; u < N; u++) {
      let s = 0;
      const cu = u * N;
      for (let x = 0; x < N; x++) s += gray32[row + x] * COS[cu + x];
      tmp[row + u] = s;
    }
  }
  // 列方向 DCT（左上 8x8 のみ必要）
  const out = new Float64Array(BLOCK * BLOCK);
  for (let v = 0; v < BLOCK; v++) {
    const cv = v * N;
    for (let u = 0; u < BLOCK; u++) {
      let s = 0;
      for (let y = 0; y < N; y++) s += tmp[y * N + u] * COS[cv + y];
      out[v * BLOCK + u] = s;
    }
  }
  return out;
}

function median63(coefs: Float64Array): number {
  // DC 項（index 0）を除いた 63 個の中央値。
  const arr = Array.from(coefs.subarray(1));
  arr.sort((a, b) => a - b);
  return arr[arr.length >> 1];
}

function bitsToHex(bits: ArrayLike<number>): string {
  let hi = 0;
  let lo = 0;
  for (let k = 0; k < 64; k++) {
    const bit = bits[k] ? 1 : 0;
    if (k < 32) hi = ((hi << 1) | bit) >>> 0;
    else lo = ((lo << 1) | bit) >>> 0;
  }
  return (hi >>> 0).toString(16).padStart(8, '0') + (lo >>> 0).toString(16).padStart(8, '0');
}

/** グレースケール（任意サイズ, 0..1）から pHash（16hex）を計算。 */
export function pHash(gray: ArrayLike<number>, w: number, h: number): string {
  const g32 = resampleGray(gray, w, h, N, N);
  const block = dct8x8(g32);
  const med = median63(block);
  const bits: number[] = new Array(64);
  for (let k = 0; k < 64; k++) bits[k] = block[k] > med ? 1 : 0;
  return bitsToHex(bits);
}

/** 安価なフォールバック: 8x8 平均しきい値 aHash（16hex）。 */
export function aHash(gray: ArrayLike<number>, w: number, h: number): string {
  const g = resampleGray(gray, w, h, BLOCK, BLOCK);
  let mean = 0;
  for (let i = 0; i < g.length; i++) mean += g[i];
  mean /= g.length;
  const bits: number[] = new Array(64);
  for (let k = 0; k < 64; k++) bits[k] = g[k] > mean ? 1 : 0;
  return bitsToHex(bits);
}
