export type Season = '春' | '夏' | '秋' | '冬';

/** 月（1..12）→ 季節。 */
export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return '春';
  if (month >= 6 && month <= 8) return '夏';
  if (month >= 9 && month <= 11) return '秋';
  return '冬';
}

export interface SeasonWord {
  word: string;
  emoji: string;
}

const WORDS: Record<number, SeasonWord> = {
  1: { word: '冬', emoji: '❄️' },
  2: { word: '冬', emoji: '❄️' },
  3: { word: '春', emoji: '🌸' },
  4: { word: '桜', emoji: '🌸' },
  5: { word: '新緑', emoji: '🌿' },
  6: { word: '梅雨', emoji: '☔' },
  7: { word: '夏', emoji: '🌻' },
  8: { word: '夏', emoji: '🌻' },
  9: { word: '秋', emoji: '🍂' },
  10: { word: '秋', emoji: '🍁' },
  11: { word: '紅葉', emoji: '🍁' },
  12: { word: '冬', emoji: '❄️' },
};

/** 月（1..12）→ 季節語＋絵文字。 */
export function seasonWord(month: number): SeasonWord {
  return WORDS[month] ?? { word: seasonOf(month), emoji: '📸' };
}
