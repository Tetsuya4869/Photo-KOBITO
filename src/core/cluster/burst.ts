import type { PhotoFeature, PhotoId } from '../types';
import { hamming } from '../features/hamming';
import { coverScore } from '../naming/cover';

export interface BurstGroup {
  memberIds: PhotoId[];
  coverId: PhotoId;
  /** burst = 時間的に連続した連写。dup = 時間に関係ないそっくり写真の束。 */
  subtype: 'burst' | 'dup';
  startAt: number | null;
  endAt: number | null;
}

export interface BurstOptions {
  burstHamming: number;
  burstTimeS: number;
  dupHamming: number;
  minLumaVariance: number;
  minBurstSize: number;
}

export const DEFAULT_BURST: BurstOptions = {
  burstHamming: 10,
  burstTimeS: 3,
  dupHamming: 5,
  minLumaVariance: 0.0008,
  minBurstSize: 3,
};

/**
 * 連写・そっくり写真の検出。パイプラインの最初に走らせ、重複が他クラスタを
 * 水増しするのを防ぐ。
 *
 * union-find で以下の辺を推移的に連結する:
 *  - burst 辺: 撮影時刻が burstTimeS 以内 かつ pHash Hamming <= burstHamming
 *  - dup 辺  : 時間に関係なく pHash Hamming <= dupHamming
 * 全黒/全白のようなフラットフレームは pHash が縮退するため、lumaVariance が
 * 小さい画像は辺を張らない（誤結合ガード）。
 */
export function detectBursts(
  features: PhotoFeature[],
  opts: BurstOptions = DEFAULT_BURST,
): BurstGroup[] {
  const n = features.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) {
      parent[r] = parent[parent[r]];
      r = parent[r];
    }
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    if (ra < rb) parent[rb] = ra;
    else parent[ra] = rb;
  };

  const timeMs = opts.burstTimeS * 1000;
  for (let i = 0; i < n; i++) {
    const fi = features[i];
    if (fi.lumaVariance < opts.minLumaVariance) continue;
    for (let j = i + 1; j < n; j++) {
      const fj = features[j];
      if (fj.lumaVariance < opts.minLumaVariance) continue;
      const dist = hamming(fi.phash, fj.phash);
      if (dist <= opts.dupHamming) {
        union(i, j);
        continue;
      }
      if (
        dist <= opts.burstHamming &&
        fi.takenAt != null &&
        fj.takenAt != null &&
        Math.abs(fi.takenAt - fj.takenAt) <= timeMs
      ) {
        union(i, j);
      }
    }
  }

  // ルートごとにまとめる
  const groups = new Map<number, PhotoFeature[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const arr = groups.get(r) ?? [];
    arr.push(features[i]);
    groups.set(r, arr);
  }

  const result: BurstGroup[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    members.sort(byTimeThenId);
    const allTimed = members.every((m) => m.takenAt != null);
    let contiguous = allTimed && members.length >= opts.minBurstSize;
    if (contiguous) {
      for (let k = 1; k < members.length; k++) {
        if ((members[k].takenAt as number) - (members[k - 1].takenAt as number) > timeMs) {
          contiguous = false;
          break;
        }
      }
    }
    const times = members.map((m) => m.takenAt).filter((t): t is number => t != null);
    result.push({
      memberIds: members.map((m) => m.id),
      coverId: bestCover(members),
      subtype: contiguous ? 'burst' : 'dup',
      startAt: times.length ? Math.min(...times) : null,
      endAt: times.length ? Math.max(...times) : null,
    });
  }

  // 決定的な並び（開始時刻→cover id）
  result.sort((a, b) => {
    const at = a.startAt ?? Infinity;
    const bt = b.startAt ?? Infinity;
    if (at !== bt) return at - bt;
    return a.coverId < b.coverId ? -1 : a.coverId > b.coverId ? 1 : 0;
  });
  return result;
}

function bestCover(members: PhotoFeature[]): PhotoId {
  let best = members[0];
  let bestScore = coverScore(best);
  for (let i = 1; i < members.length; i++) {
    const s = coverScore(members[i]);
    if (s > bestScore || (s === bestScore && members[i].id < best.id)) {
      best = members[i];
      bestScore = s;
    }
  }
  return best.id;
}

function byTimeThenId(a: PhotoFeature, b: PhotoFeature): number {
  const at = a.takenAt ?? Infinity;
  const bt = b.takenAt ?? Infinity;
  if (at !== bt) return at - bt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
