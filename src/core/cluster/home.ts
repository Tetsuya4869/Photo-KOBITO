import type { LatLng, PhotoFeature } from '../types';
import { gridSnap } from '../util/quantize';

const HOME_CELL_METERS = 1000;

/**
 * 最頻グリッドセル（〜1km）で自宅（＝いつもの場所）を推定する。
 * 旅行昇格の基準点になる。GPS 付き写真が少なすぎる場合は null。
 */
export function inferHome(features: PhotoFeature[]): LatLng | null {
  const cells = new Map<string, { sumLat: number; sumLon: number; count: number }>();
  for (const f of features) {
    if (!f.gps) continue;
    const key = gridSnap(f.gps.lat, f.gps.lon, HOME_CELL_METERS);
    const cell = cells.get(key) ?? { sumLat: 0, sumLon: 0, count: 0 };
    cell.sumLat += f.gps.lat;
    cell.sumLon += f.gps.lon;
    cell.count += 1;
    cells.set(key, cell);
  }
  if (cells.size === 0) return null;

  // 最頻セル（同数なら先に現れたキーを優先＝決定的にするためキーでタイブレーク）
  let bestKey: string | null = null;
  let bestCount = 0;
  for (const [key, cell] of cells) {
    if (cell.count > bestCount || (cell.count === bestCount && (bestKey === null || key < bestKey))) {
      bestCount = cell.count;
      bestKey = key;
    }
  }
  // 自宅と呼ぶには最低 3 枚は欲しい（単発の外出を自宅化しない）
  if (bestKey === null || bestCount < 3) return null;
  const cell = cells.get(bestKey)!;
  return { lat: cell.sumLat / cell.count, lon: cell.sumLon / cell.count };
}
