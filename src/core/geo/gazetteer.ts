import { GAZETTEER } from './gazetteer.data';
import { haversineMeters } from './haversine';

export interface NearestPlace {
  name: string;
  distM: number;
}

/**
 * 座標に最も近い有名スポットを返す。半径判定は呼び出し側に委ねる（distM を見て使うか決める）。
 * 逆ジオコードは行わず、あくまでバンドル辞書の最近傍のみ。
 */
export function nearestPlace(lat: number, lon: number): NearestPlace | null {
  let best: NearestPlace | null = null;
  for (const g of GAZETTEER) {
    const d = haversineMeters({ lat, lon }, { lat: g.lat, lon: g.lon });
    if (best === null || d < best.distM) {
      best = { name: g.name, distM: d };
    }
  }
  return best;
}

/**
 * 地名が付けられないときの相対名。自宅クラスタなら「いつもの場所」、
 * それ以外は初訪問かどうかで「はじめての場所 / この場所」。逆ジオコードを捏造しない。
 */
export function relativeName(isHome: boolean, seen: boolean): string {
  if (isHome) return 'いつもの場所';
  return seen ? 'この場所' : 'はじめての場所';
}
