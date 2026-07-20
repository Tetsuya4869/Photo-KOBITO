/** テスト用の合成 RGBA / グレースケール画像ビルダ。 */

export function solid(w: number, h: number, r: number, g: number, b: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    px[o] = r;
    px[o + 1] = g;
    px[o + 2] = b;
    px[o + 3] = 255;
  }
  return px;
}

/** 市松模様（高エッジ）。cell はブロック辺の画素数。 */
export function checkerboard(w: number, h: number, cell = 1): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const on = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      const v = on ? 255 : 0;
      const o = (y * w + x) * 4;
      px[o] = v;
      px[o + 1] = v;
      px[o + 2] = v;
      px[o + 3] = 255;
    }
  }
  return px;
}

/** 上半分が空色(青)、下半分が緑の「風景」画像。 */
export function skyAndGround(w: number, h: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  const half = Math.floor(h / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (y < half) {
        px[o] = 90;
        px[o + 1] = 150;
        px[o + 2] = 230; // 青空
      } else {
        px[o] = 60;
        px[o + 1] = 150;
        px[o + 2] = 60; // 緑
      }
      px[o + 3] = 255;
    }
  }
  return px;
}

/** RGBA → グレースケール Float32Array（0..1）。 */
export function grayscale(rgba: ArrayLike<number>, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    out[i] = (0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2]) / 255;
  }
  return out;
}

/** 左半分／右半分で色が違う縦割り画像（軽微な平行移動のノイズ耐性テスト用）。 */
export function verticalSplit(
  w: number,
  h: number,
  boundary: number,
  left: [number, number, number],
  right: [number, number, number],
): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const c = x < boundary ? left : right;
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
      px[o + 3] = 255;
    }
  }
  return px;
}
