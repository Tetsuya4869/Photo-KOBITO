/**
 * 日本の祝日テーブル（年次変動に配慮した近似）。撮影時刻は「壁時計=UTC」で符号化されて
 * いるため、UTC ゲッタで元の暦日・曜日を復元して判定する。未登録日は null。純粋・決定的。
 *
 * 注: 写真は任意の年（過去も含む）を持ちうるため、年で変わる祝日は年条件で分岐する。
 *  - 天皇誕生日: 平成(明仁) 12/23 [1989-2018] / 2019年は無し / 令和(徳仁) 2/23 [2020-]
 *  - 山の日: 2016 年から
 *  - 体育の日→スポーツの日: 2020 年から改称
 *  - 春分/秋分: 1980-2099 に有効な近似式で年ごとに 20/21・22/23 を出し分け
 */

/** 年に依存しない固定日の祝日 "M-D" → 名称。 */
const FIXED: Record<string, string> = {
  '1-1': '元日',
  '2-11': '建国記念の日',
  '4-29': '昭和の日',
  '5-3': '憲法記念日',
  '5-4': 'みどりの日',
  '5-5': 'こどもの日',
  '11-3': '文化の日',
  '11-23': '勤労感謝の日',
};

/** 第 n 月曜（ハッピーマンデー）の祝日。名称は年で変わりうるので getName で解決。 */
const NTH_MONDAY: { month: number; nth: number; getName: (year: number) => string }[] = [
  { month: 1, nth: 2, getName: () => '成人の日' },
  { month: 7, nth: 3, getName: () => '海の日' },
  { month: 9, nth: 3, getName: () => '敬老の日' },
  { month: 10, nth: 2, getName: (y) => (y >= 2020 ? 'スポーツの日' : '体育の日') },
];

function nthMondayOfMonth(year: number, month: number, nth: number): number {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=日
  const firstMonday = ((8 - firstDow) % 7) + 1;
  return firstMonday + (nth - 1) * 7;
}

/** 春分日（1980-2099 の近似）。 */
function vernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/** 秋分日（1980-2099 の近似）。 */
function autumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/** epoch ms（壁時計=UTC）から祝日名を返す。無ければ null。 */
export function holidayName(ms: number): string | null {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  const fixed = FIXED[`${month}-${day}`];
  if (fixed) return fixed;

  // 天皇誕生日（元号で日付が変わる。2019 年は該当日なし）
  if (year >= 1989 && year <= 2018 && month === 12 && day === 23) return '天皇誕生日';
  if (year >= 2020 && month === 2 && day === 23) return '天皇誕生日';

  // 山の日（2016 年から）
  if (year >= 2016 && month === 8 && day === 11) return '山の日';

  for (const h of NTH_MONDAY) {
    if (h.month === month && nthMondayOfMonth(year, month, h.nth) === day) return h.getName(year);
  }

  if (month === 3 && day === vernalEquinoxDay(year)) return '春分の日';
  if (month === 9 && day === autumnalEquinoxDay(year)) return '秋分の日';

  return null;
}
