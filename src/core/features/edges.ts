/** Sobel エッジ密度。書類/スクショ（高エッジ）と空/風景（低エッジ）の分離に使う。 */

/**
 * グレースケール（0..1, 長さ w*h）に Sobel を掛け、勾配強度が threshold を超える
 * 画素の割合 0..1 を返す。境界画素は除外。
 */
export function sobelEdgeDensity(
  gray: ArrayLike<number>,
  w: number,
  h: number,
  threshold = 0.15,
): number {
  if (w < 3 || h < 3) return 0;
  let count = 0;
  let total = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[(y - 1) * w + (x - 1)];
      const tc = gray[(y - 1) * w + x];
      const tr = gray[(y - 1) * w + (x + 1)];
      const ml = gray[y * w + (x - 1)];
      const mr = gray[y * w + (x + 1)];
      const bl = gray[(y + 1) * w + (x - 1)];
      const bc = gray[(y + 1) * w + x];
      const br = gray[(y + 1) * w + (x + 1)];
      const gx = tl + 2 * ml + bl - (tr + 2 * mr + br);
      const gy = tl + 2 * tc + tr - (bl + 2 * bc + br);
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > threshold) count++;
      total++;
    }
  }
  return total === 0 ? 0 : count / total;
}
