/**
 * 距離関数を注入する決定的な DBSCAN。
 * points の添字順に走査・拡張するため、同じ入力に対して常に同じクラスタ ID を返す。
 *
 * 返り値は各点のクラスタ ID 配列（0 始まり）。-1 は noise（外れ値）。
 * 実装は O(n^2) の近傍探索。1 セッション分の写真枚数（〜数百）では十分高速。
 */
export function dbscan<T>(
  points: T[],
  eps: number,
  minPts: number,
  distFn: (a: T, b: T) => number,
): number[] {
  const n = points.length;
  const labels = new Array<number>(n).fill(-2); // -2 = 未訪問, -1 = noise, >=0 = cluster
  let clusterId = 0;

  const regionQuery = (i: number): number[] => {
    const neighbors: number[] = [];
    for (let j = 0; j < n; j++) {
      if (distFn(points[i], points[j]) <= eps) neighbors.push(j);
    }
    return neighbors;
  };

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2) continue;
    const neighbors = regionQuery(i);
    if (neighbors.length < minPts) {
      labels[i] = -1; // noise（後でクラスタの周辺点として拾われる可能性あり）
      continue;
    }
    labels[i] = clusterId;
    // シードキュー。i の近傍から広げる。
    const queue = neighbors.filter((j) => j !== i);
    for (let q = 0; q < queue.length; q++) {
      const j = queue[q];
      if (labels[j] === -1) labels[j] = clusterId; // noise → border 点として編入
      if (labels[j] !== -2) continue;
      labels[j] = clusterId;
      const jn = regionQuery(j);
      if (jn.length >= minPts) {
        for (const m of jn) {
          if (!queue.includes(m)) queue.push(m);
        }
      }
    }
    clusterId++;
  }

  return labels;
}
