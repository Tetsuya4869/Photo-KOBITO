import type { AlbumDraft } from '../types';

function ymd(ms: number): { y: number; m: number; d: number } {
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function fmtMD(ms: number): string {
  const { m, d } = ymd(ms);
  return `${m}月${d}日`;
}

/** 低信頼のシーンラベル（断定を避けるトーンにする）。 */
const SOFT_SCENE = new Set(['グルメ', '人物', 'あたたかい色']);

/**
 * 「なぜまとまったか」の平易な日本語説明を決定的に生成する。
 * こびとの一人称・親しみ文体。閾値をやんわり開示して透明性を出す。
 */
export function reasonFor(draft: AlbumDraft): string {
  const n = draft.photoIds.length;
  switch (draft.kind) {
    case 'trip': {
      const nights = draft.tripNights ?? 0;
      const span =
        draft.dateRange && draft.dateRange[0] !== draft.dateRange[1]
          ? `${fmtMD(draft.dateRange[0])}〜${fmtMD(draft.dateRange[1])}の`
          : '';
      const stay = nights > 0 ? `${nights}泊${nights + 1}日ぶんの` : '日帰りの';
      return `${span}${stay}おでかけっぽい${n}枚を、ひとつの旅としてまとめたよ。`;
    }
    case 'day': {
      const when = draft.dateRange ? `${fmtMD(draft.dateRange[0])}・` : '';
      const place = draft.place?.known ? `${draft.place.name}あたりで` : '';
      return `${when}${place}近い時間に撮った${n}枚を、その日のできごととしてまとめたよ。`;
    }
    case 'place': {
      if (draft.place?.isHome) return `いつもよく撮っている場所の${n}枚をあつめたよ。`;
      const name = draft.place?.known ? `${draft.place.name}の近く` : '同じ場所';
      return `${name}で撮った${n}枚をまとめたよ。`;
    }
    case 'burst': {
      if (draft.burstSubtype === 'dup') {
        return `そっくりな写真が${n}枚。見比べやすいようにまとめて、いちばん良い1枚を表紙にしたよ。`;
      }
      let diff = '';
      if (draft.dateRange) {
        const sec = (draft.dateRange[1] - draft.dateRange[0]) / 1000;
        diff = sec > 0 ? `${sec.toFixed(1)}秒のあいだの` : '';
      }
      return `${diff}連写${n}枚。いちばんくっきりした1枚を表紙にしたよ。`;
    }
    case 'scene': {
      const label = draft.sceneLabel ?? 'いろいろ';
      const soft = SOFT_SCENE.has(label) ? '（自信ひかえめ）' : '';
      const phrase = scenePhrase(label);
      return `${phrase}${n}枚みつけたよ。${soft}`;
    }
    case 'screenshot':
      return `カメラで撮っていない、スクショや書類っぽい写真を${n}枚あつめたよ。`;
    case 'device':
      return `${draft.deviceModel ?? 'このカメラ'}で撮った写真を${n}枚あつめたよ。`;
    case 'monthly': {
      const mk = draft.monthKey;
      if (mk) {
        return `${mk.year}年${mk.month}月に撮った、どのアルバムにも入らなかった${n}枚をここにまとめておいたよ。`;
      }
      return `撮影日時がわからなかった${n}枚を、ここにまとめておいたよ。`;
    }
  }
}

function scenePhrase(label: string): string {
  switch (label) {
    case '青空':
      return '青空がきれいな写真を';
    case '夜景':
      return '夜に撮った写真を';
    case '夕焼け':
      return 'あたたかい夕方の色をした写真を';
    case 'みどり':
      return '緑や自然が多い写真を';
    case 'グルメ':
      return 'おいしそう…料理っぽい写真を';
    case 'モノクロ':
      return '色みの少ないモノクロっぽい写真を';
    case '人物':
      return '人物っぽい写真を';
    case 'あたたかい色':
      return 'あたたかい色あいの写真を';
    default:
      return '雰囲気の似た写真を';
  }
}
