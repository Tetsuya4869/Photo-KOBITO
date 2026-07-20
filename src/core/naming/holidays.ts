/**
 * 静的な日本の祝日テーブル（概略）。撮影時刻は「壁時計=UTC」で符号化されているため、
 * UTC ゲッタで元の暦日・曜日を復元して判定する。未登録日は null。
 */

/** 固定日の祝日 "M-D" → 名称。 */
const FIXED: Record<string, string> = {
  '1-1': '元日',
  '2-11': '建国記念の日',
  '2-23': '天皇誕生日',
  '4-29': '昭和の日',
  '5-3': '憲法記念日',
  '5-4': 'みどりの日',
  '5-5': 'こどもの日',
  '8-11': '山の日',
  '11-3': '文化の日',
  '11-23': '勤労感謝の日',
};

/** 第 n 月曜の祝日（month は 1..12）。 */
const NTH_MONDAY: { month: number; nth: number; name: string }[] = [
  { month: 1, nth: 2, name: '成人の日' },
  { month: 7, nth: 3, name: '海の日' },
  { month: 9, nth: 3, name: '敬老の日' },
  { month: 10, nth: 2, name: 'スポーツの日' },
];

function nthMondayOfMonth(year: number, month: number, nth: number): number {
  // month は 1..12。UTC で第 1 日の曜日を求める。
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=日
  const firstMonday = ((8 - firstDow) % 7) + 1; // 最初の月曜の日
  return firstMonday + (nth - 1) * 7;
}

/** epoch ms（壁時計=UTC）から祝日名を返す。無ければ null。 */
export function holidayName(ms: number): string | null {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  const fixed = FIXED[`${month}-${day}`];
  if (fixed) return fixed;

  for (const h of NTH_MONDAY) {
    if (h.month === month && nthMondayOfMonth(year, month, h.nth) === day) return h.name;
  }

  // 春分・秋分（概略の固定日）
  if (month === 3 && day === 20) return '春分の日';
  if (month === 9 && day === 23) return '秋分の日';

  return null;
}
