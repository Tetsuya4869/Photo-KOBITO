import type { Confidence } from '../core/types';

/** 撮影時刻は「壁時計=UTC」で符号化されているため UTC ゲッタで表示用の暦を復元する。 */
function md(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** 日付レンジを短く整形（同日は1つ、複数日は範囲）。 */
export function fmtDateRange(range: [number, number] | undefined): string {
  if (!range) return '日付不明';
  const [s, e] = range;
  const ds = md(s);
  const de = md(e);
  return ds === de ? ds : `${ds}〜${de}`;
}

export function confidenceDots(c: Confidence): number {
  return c === 'high' ? 3 : c === 'med' ? 2 : 1;
}

export function confidenceWord(c: Confidence): string {
  return c === 'high' ? 'かなり自信あり' : c === 'med' ? 'まあまあ自信あり' : '自信ひかえめ';
}
