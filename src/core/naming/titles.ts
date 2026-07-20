import type { AlbumDraft } from '../types';
import { seasonWord } from './season';
import { holidayName } from './holidays';
import { reasonFor } from './reason';

export interface TitleResult {
  title: string;
  emoji: string;
  reason: string;
}

const SCENE_TITLES: Record<string, { title: string; emoji: string }> = {
  青空: { title: '青空コレクション', emoji: '☁️' },
  夜景: { title: '夜さんぽ', emoji: '🌙' },
  夕焼け: { title: '夕焼けの記録', emoji: '🌇' },
  みどり: { title: 'みどりの写真', emoji: '🌿' },
  グルメ: { title: 'おいしいもの記録', emoji: '🍽️' },
  モノクロ: { title: 'モノクロ写真', emoji: '🎞️' },
  人物: { title: 'だれかとの写真', emoji: '👥' },
  あたたかい色: { title: 'あたたかい色の写真', emoji: '🎨' },
  いろいろ: { title: 'いろいろな写真', emoji: '🗂️' },
};

function md(ms: number): { y: number; m: number; d: number } {
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/**
 * アルバムの日本語タイトル・絵文字・理由を決定的に生成する。
 * 地名は gazetteer ヒット時のみ断定し、外れたら相対名にフォールバック（捏造しない）。
 */
export function titleForAlbum(draft: AlbumDraft): TitleResult {
  const reason = reasonFor(draft);
  const n = draft.photoIds.length;

  switch (draft.kind) {
    case 'trip': {
      const nights = draft.tripNights ?? 0;
      const span = nights > 0 ? `${nights}泊${nights + 1}日の旅` : '日帰り旅';
      if (draft.place?.known) {
        return { title: `${draft.place.name}、${span}`, emoji: '🚅', reason };
      }
      return { title: `はじめての場所への旅`, emoji: '🧭', reason };
    }
    case 'place': {
      if (draft.place?.isHome) return { title: 'いつもの場所', emoji: '🏠', reason };
      if (draft.place?.known) return { title: `${draft.place.name}あたり`, emoji: '📍', reason };
      return { title: 'はじめての場所', emoji: '📍', reason };
    }
    case 'day': {
      const ms = draft.dateRange ? draft.dateRange[0] : 0;
      const { m, d } = md(ms);
      const holi = draft.dateRange ? holidayName(ms) : null;
      const sw = seasonWord(m);
      if (holi) return { title: `${holi}のおでかけ`, emoji: sw.emoji, reason };
      return { title: `${m}月${d}日のおでかけ`, emoji: sw.emoji, reason };
    }
    case 'burst': {
      if (draft.burstSubtype === 'dup') {
        return { title: 'にたものコレクション', emoji: '🖇️', reason };
      }
      return { title: `そっくりさんフォト（${n}枚）`, emoji: '👯', reason };
    }
    case 'scene': {
      const label = draft.sceneLabel ?? 'いろいろ';
      const t = SCENE_TITLES[label] ?? SCENE_TITLES['いろいろ'];
      return { title: t.title, emoji: t.emoji, reason };
    }
    case 'screenshot':
      return { title: 'スクショ整理', emoji: '📱', reason };
    case 'device':
      return { title: `${draft.deviceModel ?? 'このカメラ'}で撮った写真`, emoji: '📷', reason };
    case 'monthly': {
      const mk = draft.monthKey;
      const title = mk ? `${mk.year}年${mk.month}月のこと` : 'いつかの写真たち';
      return { title, emoji: '🗓️', reason };
    }
  }
}
