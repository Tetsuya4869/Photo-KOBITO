import type { PhotoFeature } from '../types';
import { rgbToHsv } from '../features/colorSpace';

/** シーン分類の信頼度フロア。これ未満はテーマアルバムを作らない。 */
export const SCENE_FLOOR = 0.55;
/** テーマアルバム成立に必要な同一ラベルの最小枚数。 */
export const SCENE_THEME_MIN = 6;

/** 優先順位（先にマッチしたものを採用）。 */
export const SCENE_ORDER = [
  'スクショ',
  '夜景',
  '夕焼け',
  '青空',
  'みどり',
  'グルメ',
  'モノクロ',
  '人物',
] as const;

export type SceneLabel = (typeof SCENE_ORDER)[number] | 'あたたかい色' | 'いろいろ';

export interface SceneResult {
  label: SceneLabel;
  confidence: number;
}

const SCREENSHOT_NAME = /scre[ _-]?shot|スクリーンショット|スクショ/i;

function topHue(f: PhotoFeature): number | null {
  if (f.colors.length === 0) return null;
  const hex = f.colors[0].hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return rgbToHsv(r, g, b).h;
}

function isWarmHue(h: number | null): boolean {
  if (h === null) return false;
  return (h >= 0 && h <= 45) || (h >= 330 && h <= 360);
}

function scoreScreenshot(f: PhotoFeature): number {
  const nameHint = SCREENSHOT_NAME.test(f.name);
  const noCamera = !f.camera || !f.camera.make;
  const featureHint = noCamera && f.edgeDensity > 0.3 && f.brightness > 0.75 && f.saturation < 0.25;
  if (nameHint && featureHint) return 0.95;
  if (nameHint) return 0.85;
  if (featureHint) return 0.65;
  return 0;
}

function scoreNight(f: PhotoFeature): number {
  if (f.brightness < 0.12) return 0.8;
  if (f.brightness < 0.22) return 0.66;
  if (f.camera?.iso != null && f.camera.iso >= 1600 && f.brightness < 0.4) return 0.6;
  return 0;
}

function scoreSunset(f: PhotoFeature): number {
  const h = topHue(f);
  // 夕焼けは横長の空が多い。料理（正方形・近接・高彩度）との衝突を aspect で切り分ける。
  if (
    isWarmHue(h) &&
    f.aspect >= 1.2 &&
    f.warmth > 0.12 &&
    f.brightness >= 0.3 &&
    f.brightness <= 0.78 &&
    f.colorfulness > 25
  ) {
    return 0.6;
  }
  return 0;
}

function scoreBlueSky(f: PhotoFeature): number {
  if (f.blueTopRatio > 0.4 && f.brightness > 0.55 && f.edgeDensity < 0.15) {
    return Math.min(0.85, 0.6 + (f.blueTopRatio - 0.4));
  }
  return 0;
}

function scoreGreen(f: PhotoFeature): number {
  if (f.greenRatio > 0.35 && f.saturation > 0.3) {
    return Math.min(0.85, 0.6 + (f.greenRatio - 0.35));
  }
  return 0;
}

function scoreFood(f: PhotoFeature): number {
  if (f.warmth > 0.05 && f.saturation > 0.4 && f.colorfulness > 40 && f.edgeDensity < 0.35) {
    return 0.56;
  }
  return 0;
}

function scoreMono(f: PhotoFeature): number {
  if (f.saturation < 0.12 && f.camera?.make && f.edgeDensity < 0.5 && f.brightness > 0.1) {
    return 0.7;
  }
  return 0;
}

function scorePortrait(f: PhotoFeature): number {
  const skin = isWarmHue(topHue(f)) && f.saturation > 0.15 && f.saturation < 0.6;
  if (f.aspect < 1 && f.camera?.fNumber != null && f.camera.fNumber < 2.8 && skin) {
    return 0.56;
  }
  return 0;
}

const RULES: Record<(typeof SCENE_ORDER)[number], (f: PhotoFeature) => number> = {
  スクショ: scoreScreenshot,
  夜景: scoreNight,
  夕焼け: scoreSunset,
  青空: scoreBlueSky,
  みどり: scoreGreen,
  グルメ: scoreFood,
  モノクロ: scoreMono,
  人物: scorePortrait,
};

/**
 * 優先順位付きルールエンジン。最初にスコアが付いたラベルを採用する。
 * どれもマッチしなければ、暖色寄りなら『あたたかい色』、それ以外は『いろいろ』に退避。
 */
export function classifyScene(f: PhotoFeature): SceneResult {
  for (const label of SCENE_ORDER) {
    const conf = RULES[label](f);
    if (conf > 0) return { label, confidence: conf };
  }
  if (f.warmth > 0.15) return { label: 'あたたかい色', confidence: 0.5 };
  return { label: 'いろいろ', confidence: 0.4 };
}
