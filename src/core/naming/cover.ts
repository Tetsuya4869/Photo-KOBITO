import type { PhotoFeature, PhotoId } from '../types';
import { clamp01 } from '../util/distance';

/**
 * カバー（表紙）スコア。鮮鋭さ・露出の中庸さ・色の豊かさの加重和。
 * 連写グループやアルバムから「いちばん良い1枚」を選ぶのに使う。
 */
export function coverScore(f: PhotoFeature): number {
  const sharp = clamp01(f.edgeDensity); // 鮮鋭さの代理
  const exposure = 1 - Math.min(1, Math.abs(f.brightness - 0.5) * 2); // 中庸な明るさで高得点
  const vivid = clamp01(f.colorfulness / 100);
  return 0.5 * sharp + 0.3 * exposure + 0.2 * vivid;
}

/** 与えられた写真群からベストショットの id を返す。同スコアは id 昇順で安定選抜。 */
export function pickCover(features: PhotoFeature[]): PhotoId {
  if (features.length === 0) throw new Error('pickCover: empty');
  let best = features[0];
  let bestScore = coverScore(best);
  for (let i = 1; i < features.length; i++) {
    const f = features[i];
    const s = coverScore(f);
    if (s > bestScore || (s === bestScore && f.id < best.id)) {
      best = f;
      bestScore = s;
    }
  }
  return best.id;
}
