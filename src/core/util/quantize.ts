/** 決定的な量子化ヘルパ（グリッドスナップ・色相ビン化）。 */

/**
 * 緯度経度を、おおよそ cellMeters 四方のグリッドセルにスナップし、そのセルを表す
 * 文字列キーを返す。自宅推定（最頻セル）などに使う。
 *
 * 緯度方向は約 111,320m/度で一定。経度方向は緯度で縮むため cos(lat) で補正する。
 */
export function gridSnap(lat: number, lon: number, cellMeters: number): string {
  const latDegPerCell = cellMeters / 111_320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  // 極付近で 0 割りを避ける
  const lonMetersPerDeg = 111_320 * Math.max(0.01, Math.abs(cosLat));
  const lonDegPerCell = cellMeters / lonMetersPerDeg;
  const latCell = Math.round(lat / latDegPerCell);
  const lonCell = Math.round(lon / lonDegPerCell);
  return `${latCell}:${lonCell}`;
}

/** 色相 (0..360) を bins 個の等間隔ビンに割り当てる。 */
export function hueBin(h: number, bins: number): number {
  const norm = ((h % 360) + 360) % 360;
  return Math.min(bins - 1, Math.floor((norm / 360) * bins));
}
