import { describe, it, expect } from 'vitest';
import { dbscan } from './dbscan';

interface P {
  x: number;
  y: number;
}
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

describe('dbscan', () => {
  it('2 つの密集群 + 外れ点 → 2 クラスタ + noise', () => {
    const pts: P[] = [
      // 群A
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      // 群B
      { x: 100, y: 100 },
      { x: 101, y: 100 },
      { x: 100, y: 101 },
      // 外れ点
      { x: 50, y: 50 },
    ];
    const labels = dbscan(pts, 2, 3, dist);
    // 群A は同一クラスタ
    expect(labels[0]).toBe(labels[1]);
    expect(labels[0]).toBe(labels[2]);
    expect(labels[0]).toBe(labels[3]);
    // 群B は別クラスタ
    expect(labels[4]).toBe(labels[5]);
    expect(labels[4]).not.toBe(labels[0]);
    // 外れ点は noise
    expect(labels[7]).toBe(-1);
    // クラスタは 2 つ
    const clusters = new Set(labels.filter((l) => l >= 0));
    expect(clusters.size).toBe(2);
  });

  it('決定的: id 順でラベルが安定', () => {
    const pts: P[] = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
      { x: 10, y: 10 },
      { x: 10.5, y: 10 },
      { x: 11, y: 10 },
    ];
    const a = dbscan(pts, 1, 2, dist);
    const b = dbscan(pts, 1, 2, dist);
    expect(a).toEqual(b);
    // 最初のクラスタは 0、次は 1
    expect(a[0]).toBe(0);
    expect(a[3]).toBe(1);
  });

  it('minPts を満たさなければ全て noise', () => {
    const pts: P[] = [
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
    ];
    const labels = dbscan(pts, 1, 3, dist);
    expect(labels).toEqual([-1, -1]);
  });

  it('空配列', () => {
    expect(dbscan([], 1, 2, dist)).toEqual([]);
  });
});
