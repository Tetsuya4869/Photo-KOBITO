import type { AlbumDraft, AlbumKind, PhotoId } from '../types';

/** 主バッジ優先ラダー（小さいほど優先）。旅行 > 場所 > その日 > シーン > 連写 > … */
const PRIORITY: Record<AlbumKind, number> = {
  trip: 0,
  place: 1,
  day: 2,
  scene: 3,
  burst: 4,
  screenshot: 5,
  device: 6,
  monthly: 7,
};

export function albumPriority(kind: AlbumKind): number {
  return PRIORITY[kind];
}

/** 2 つの id 集合の Jaccard 係数。 */
export function jaccard(a: Set<PhotoId>, b: Set<PhotoId>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * 重複しすぎるアルバム（Jaccard > threshold）を、優先度の高い方だけ残して畳む。
 * アルバムは排他分割ではなく「レンズ」なので通常は共存させるが、ほぼ同一の
 * 2 枚看板は冗長なので統合する。
 */
export function dedupeByJaccard(drafts: AlbumDraft[], threshold = 0.8): AlbumDraft[] {
  // 優先度昇順（＝優先度高い順）。同順位は枚数の多い順で安定化。
  const ordered = drafts
    .map((d, i) => ({ d, i, set: new Set(d.photoIds) }))
    .sort((x, y) => {
      const p = PRIORITY[x.d.kind] - PRIORITY[y.d.kind];
      if (p !== 0) return p;
      if (y.d.photoIds.length !== x.d.photoIds.length) {
        return y.d.photoIds.length - x.d.photoIds.length;
      }
      return x.i - y.i;
    });

  const kept: { d: AlbumDraft; set: Set<PhotoId> }[] = [];
  for (const cand of ordered) {
    let dup = false;
    for (const k of kept) {
      if (jaccard(cand.set, k.set) > threshold) {
        dup = true;
        break;
      }
    }
    if (!dup) kept.push({ d: cand.d, set: cand.set });
  }
  return kept.map((k) => k.d);
}
