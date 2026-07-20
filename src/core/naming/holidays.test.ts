import { describe, it, expect } from 'vitest';
import { holidayName } from './holidays';

const at = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d, 12, 0, 0);

describe('holidayName', () => {
  it('固定日の祝日', () => {
    expect(holidayName(at(2026, 1, 1))).toBe('元日');
    expect(holidayName(at(2026, 5, 5))).toBe('こどもの日');
    expect(holidayName(at(2026, 11, 23))).toBe('勤労感謝の日');
  });

  it('祝日でない日は null', () => {
    expect(holidayName(at(2026, 7, 3))).toBeNull();
    expect(holidayName(at(2026, 6, 13))).toBeNull();
  });

  it('天皇誕生日は元号で日付が変わる（2019年は該当なし）', () => {
    expect(holidayName(at(2017, 12, 23))).toBe('天皇誕生日'); // 平成
    expect(holidayName(at(2019, 12, 23))).toBeNull(); // 譲位年は無し
    expect(holidayName(at(2019, 2, 23))).toBeNull(); // 令和はまだ
    expect(holidayName(at(2023, 2, 23))).toBe('天皇誕生日'); // 令和
  });

  it('山の日は2016年から', () => {
    expect(holidayName(at(2015, 8, 11))).toBeNull();
    expect(holidayName(at(2016, 8, 11))).toBe('山の日');
  });

  it('体育の日→スポーツの日（2020年改称, 10月第2月曜）', () => {
    expect(holidayName(at(2019, 10, 14))).toBe('体育の日');
    expect(holidayName(at(2022, 10, 10))).toBe('スポーツの日');
  });

  it('海の日（7月第3月曜）', () => {
    expect(holidayName(at(2024, 7, 15))).toBe('海の日');
  });

  it('秋分の日は年で 22/23 を出し分ける', () => {
    expect(holidayName(at(2020, 9, 22))).toBe('秋分の日'); // 閏年は22日
    expect(holidayName(at(2020, 9, 23))).toBeNull();
    expect(holidayName(at(2025, 9, 23))).toBe('秋分の日');
  });

  it('春分の日は年で 20/21 を出し分ける', () => {
    expect(holidayName(at(2023, 3, 21))).toBe('春分の日');
    expect(holidayName(at(2023, 3, 20))).toBeNull();
    expect(holidayName(at(2024, 3, 20))).toBe('春分の日');
  });
});
