import { describe, it, expect } from 'vitest';
import { classifyScene, SCENE_FLOOR, SCENE_THEME_MIN, SCENE_ORDER } from './scene';
import { feat } from '../../../test/fixtures/feature';

describe('classifyScene — 代表特徴で期待ラベル', () => {
  it('スクショ: カメラ無し・高エッジ・高明度・低彩度', () => {
    const f = feat('s', { camera: null, edgeDensity: 0.5, brightness: 0.9, saturation: 0.1, name: 'Screenshot_1.png' });
    expect(classifyScene(f).label).toBe('スクショ');
  });

  it('夜景: 低輝度', () => {
    const f = feat('n', { brightness: 0.1 });
    expect(classifyScene(f).label).toBe('夜景');
  });

  it('青空: 上部が青く低エッジ', () => {
    const f = feat('b', { blueTopRatio: 0.6, brightness: 0.7, edgeDensity: 0.08, colors: [{ hex: '#5aa9e6', lab: [66, -6, -35], weight: 1 }] });
    expect(classifyScene(f).label).toBe('青空');
  });

  it('みどり: 緑が多く彩度あり', () => {
    const f = feat('g', { greenRatio: 0.5, saturation: 0.4, brightness: 0.5, colors: [{ hex: '#4a7a3a', lab: [46, -25, 30], weight: 1 }] });
    expect(classifyScene(f).label).toBe('みどり');
  });

  it('グルメ: 暖色・高彩度・高colorfulness・正方形（夕焼けと衝突しない）', () => {
    const f = feat('f', {
      aspect: 1,
      warmth: 0.2,
      saturation: 0.55,
      colorfulness: 62,
      brightness: 0.52,
      edgeDensity: 0.22,
      colors: [{ hex: '#c85a2b', lab: [45, 45, 45], weight: 1 }],
    });
    expect(classifyScene(f).label).toBe('グルメ');
  });

  it('夕焼け: 暖色・横長の空', () => {
    const f = feat('sunset', {
      aspect: 1.5,
      warmth: 0.2,
      brightness: 0.6,
      colorfulness: 40,
      colors: [{ hex: '#e8863c', lab: [63, 30, 55], weight: 1 }],
    });
    expect(classifyScene(f).label).toBe('夕焼け');
  });

  it('モノクロ: 彩度極小・カメラ有り', () => {
    const f = feat('m', { saturation: 0.05, brightness: 0.5, edgeDensity: 0.3 });
    expect(classifyScene(f).label).toBe('モノクロ');
  });

  it('該当なしは いろいろ（または あたたかい色）に退避', () => {
    const f = feat('x', { saturation: 0.3, brightness: 0.5, edgeDensity: 0.2, warmth: 0 });
    expect(['いろいろ', 'あたたかい色']).toContain(classifyScene(f).label);
  });

  it('優先順位: スクショが夜景より先に評価される', () => {
    // 低輝度だがスクショ条件も満たすような矛盾入力では、順序で先の判定を採用する設計
    expect(SCENE_ORDER.indexOf('スクショ')).toBeLessThan(SCENE_ORDER.indexOf('夜景'));
  });

  it('スクショはファイル名ヒントで高信頼', () => {
    const f = feat('s2', { camera: null, edgeDensity: 0.5, brightness: 0.9, saturation: 0.1, name: 'スクリーンショット.png' });
    const r = classifyScene(f);
    expect(r.label).toBe('スクショ');
    expect(r.confidence).toBeGreaterThan(0.8);
  });
});

describe('定数', () => {
  it('フロアとテーマ閾値', () => {
    expect(SCENE_FLOOR).toBe(0.55);
    expect(SCENE_THEME_MIN).toBe(6);
  });
});
