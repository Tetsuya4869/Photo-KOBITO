import type { Album, AlbumDraft, Confidence, LatLng, PhotoFeature, PhotoId } from '../core/types';
import { detectBursts, DEFAULT_BURST } from '../core/cluster/burst';
import { buildTimeline, DEFAULT_TIMELINE } from '../core/cluster/timeline';
import { buildPlaces, DEFAULT_PLACES } from '../core/cluster/places';
import {
  classifyScene,
  SCENE_FLOOR,
  SCENE_THEME_MIN,
} from '../core/cluster/scene';
import { inferHome } from '../core/cluster/home';
import { dedupeByJaccard, albumPriority } from '../core/cluster/union';
import { pickCover } from '../core/naming/cover';
import { titleForAlbum } from '../core/naming/titles';
import { nearestPlace } from '../core/geo/gazetteer';
import { haversineMeters } from '../core/geo/haversine';

export interface BuildOptions {
  /** 支配色抽出などの決定性シード（未指定=42）。 */
  seed?: number;
  minEventPhotos?: number;
  minPlacePhotos?: number;
  minDevicePhotos?: number;
}

const HOME_RADIUS_M = 1000;
const PLACE_NAME_RADIUS_M = 1500;
const CITY_NAME_RADIUS_M = 8000;

/**
 * トップレベルの「脳」。PhotoFeature[] を受け取り、複数の信号（連写・時間・場所・
 * シーン）から自動アルバム（Album[]）を編成する純粋・同期関数。
 * すべての写真が最低 1 つのアルバムに入る（月次回収で取りこぼしを防ぐ）。
 */
export function buildAlbums(features: PhotoFeature[], opts: BuildOptions = {}): Album[] {
  if (features.length === 0) return [];

  const minEvent = opts.minEventPhotos ?? DEFAULT_TIMELINE.minEventPhotos;
  const minPlace = opts.minPlacePhotos ?? 5;
  const minDevice = opts.minDevicePhotos ?? 30;

  // 入力順に依存しないよう正準ソート（時刻→id）
  const sorted = features
    .slice()
    .sort((a, b) => (a.takenAt ?? Infinity) - (b.takenAt ?? Infinity) || (a.id < b.id ? -1 : 1));
  const byId = new Map<PhotoId, PhotoFeature>(sorted.map((f) => [f.id, f]));
  const featuresOf = (ids: PhotoId[]) => ids.map((id) => byId.get(id)!).filter(Boolean);

  // --- 0. 先にシーン分類（スクショ判定を時間クラスタから除外するため）---
  //   人物・いろいろ・低信頼は「意味のあるラベル」として扱わない。
  const sceneByPhoto = new Map<PhotoId, string>();
  const screenshotIds = new Set<PhotoId>();
  for (const f of sorted) {
    const { label, confidence } = classifyScene(f);
    if (confidence < SCENE_FLOOR) continue;
    if (label === 'スクショ') screenshotIds.add(f.id);
    if (label === 'いろいろ' || label === '人物') continue;
    sceneByPhoto.set(f.id, label);
  }

  // --- 1. 連写・そっくり（先に走らせる）---
  const bursts = detectBursts(sorted, DEFAULT_BURST);
  const nonCoverBurstMembers = new Set<PhotoId>();
  for (const g of bursts) {
    for (const id of g.memberIds) if (id !== g.coverId) nonCoverBurstMembers.add(id);
  }
  const countedIds = new Set<PhotoId>(sorted.map((f) => f.id).filter((id) => !nonCoverBurstMembers.has(id)));

  // --- 2. 自宅推定 & 時間・場所クラスタ（スクショは生活イベントに混ぜない）---
  const eventFeatures = sorted.filter((f) => !screenshotIds.has(f.id));
  const home = inferHome(eventFeatures);
  const timeline = buildTimeline(eventFeatures, home, DEFAULT_TIMELINE, countedIds);
  const places = buildPlaces(eventFeatures, DEFAULT_PLACES);

  const drafts: AlbumDraft[] = [];

  // --- 3. 時間クラスタ → trip / day ---
  for (const tc of timeline) {
    if (tc.kind === 'trip') {
      drafts.push({
        kind: 'trip',
        photoIds: tc.photoIds,
        coverId: pickCover(featuresOf(tc.photoIds)),
        confidence: 'high',
        dateRange: [tc.startAt, tc.endAt],
        tripNights: tc.nights,
        place: tripPlace(featuresOf(tc.photoIds), home),
      });
    } else if (tc.countedCount >= minEvent) {
      drafts.push({
        kind: 'day',
        photoIds: tc.photoIds,
        coverId: pickCover(featuresOf(tc.photoIds)),
        confidence: tc.countedCount >= 8 ? 'high' : 'med',
        dateRange: [tc.startAt, tc.endAt],
        place: dayPlace(featuresOf(tc.photoIds), home),
      });
    }
  }

  // --- 4. 場所クラスタ → place（地名が付く／自宅のときだけアルバム化。無名の場所は
  //        「はじめての場所」の乱発を避けるためスキップし、時間クラスタ側に委ねる）---
  for (const pc of places) {
    if (pc.photoIds.length < minPlace) continue;
    const named = namePlace(pc.centroid, home, PLACE_NAME_RADIUS_M);
    if (!named.known && !named.isHome) continue;
    drafts.push({
      kind: 'place',
      photoIds: pc.photoIds,
      coverId: pickCover(featuresOf(pc.photoIds)),
      confidence: named.known ? 'med' : 'low',
      dateRange: pc.startAt != null && pc.endAt != null ? [pc.startAt, pc.endAt] : undefined,
      place: named,
    });
  }

  // --- 5. 連写 → burst ---
  for (const g of bursts) {
    if (g.memberIds.length < DEFAULT_BURST.minBurstSize) continue;
    drafts.push({
      kind: 'burst',
      photoIds: g.memberIds,
      coverId: g.coverId,
      confidence: 'high',
      dateRange: g.startAt != null && g.endAt != null ? [g.startAt, g.endAt] : undefined,
      burstSubtype: g.subtype,
    });
  }

  // --- 6. シーンテーマ → scene / screenshot（section 0 の分類結果を集約）---
  const sceneGroups = new Map<string, PhotoFeature[]>();
  for (const f of sorted) {
    const label = sceneByPhoto.get(f.id);
    if (!label) continue;
    const arr = sceneGroups.get(label) ?? [];
    arr.push(f);
    sceneGroups.set(label, arr);
  }
  for (const [label, group] of sceneGroups) {
    if (group.length < SCENE_THEME_MIN) continue;
    const ids = group.map((f) => f.id);
    const kind = label === 'スクショ' ? 'screenshot' : 'scene';
    drafts.push({
      kind,
      photoIds: ids,
      coverId: pickCover(group),
      confidence: kind === 'screenshot' ? 'high' : 'med',
      dateRange: dateRangeOf(group),
      sceneLabel: kind === 'scene' ? label : undefined,
    });
  }

  // --- 7. デバイス別（複数機種があるときのみ）---
  const modelGroups = new Map<string, PhotoFeature[]>();
  for (const f of sorted) {
    const model = f.camera?.model;
    if (!model) continue;
    const arr = modelGroups.get(model) ?? [];
    arr.push(f);
    modelGroups.set(model, arr);
  }
  if (modelGroups.size >= 2) {
    for (const [model, group] of modelGroups) {
      if (group.length < minDevice) continue;
      drafts.push({
        kind: 'device',
        photoIds: group.map((f) => f.id),
        coverId: pickCover(group),
        confidence: 'med',
        dateRange: dateRangeOf(group),
        deviceModel: model,
      });
    }
  }

  // --- 8. 重複しすぎるアルバムを畳む ---
  const deduped = dedupeByJaccard(drafts, 0.8);

  // --- 9. 月次回収（どのアルバムにも入らなかった写真を必ず拾う）---
  const covered = new Set<PhotoId>();
  for (const d of deduped) for (const id of d.photoIds) covered.add(id);
  const remaining = sorted.filter((f) => !covered.has(f.id));
  drafts.length = 0; // reuse
  const monthlyDrafts = recoverMonthly(remaining);

  const finalDrafts = [...deduped, ...monthlyDrafts];

  // --- 10. 命名・シーンタグ付与・最終 Album 化 ---
  const albums: Album[] = finalDrafts.map((d) => {
    const { title, emoji, reason } = titleForAlbum(d);
    const sceneTags = collectSceneTags(d.photoIds, sceneByPhoto, d.sceneLabel);
    return {
      id: `${d.kind}-${d.coverId}`,
      kind: d.kind,
      title,
      emoji,
      reason,
      confidence: d.confidence,
      photoIds: d.photoIds,
      coverId: d.coverId,
      sceneTags,
      dateRange: d.dateRange,
    };
  });

  // --- 11. 表示順（種類の優先度 → 新しい順）---
  albums.sort((a, b) => {
    const p = albumPriority(a.kind) - albumPriority(b.kind);
    if (p !== 0) return p;
    const at = a.dateRange ? a.dateRange[1] : -Infinity;
    const bt = b.dateRange ? b.dateRange[1] : -Infinity;
    if (at !== bt) return bt - at; // 新しい順
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return albums;
}

function dateRangeOf(features: PhotoFeature[]): [number, number] | undefined {
  const times = features.map((f) => f.takenAt).filter((t): t is number => t != null);
  if (times.length === 0) return undefined;
  return [Math.min(...times), Math.max(...times)];
}

function namePlace(
  centroid: LatLng,
  home: LatLng | null,
  radiusM: number,
): { name: string; isHome: boolean; known: boolean } {
  const isHome = home != null && haversineMeters(home, centroid) <= HOME_RADIUS_M;
  const near = nearestPlace(centroid.lat, centroid.lon);
  const known = near != null && near.distM <= radiusM;
  return { name: known ? near!.name : '', isHome, known };
}

function placeCentroid(features: PhotoFeature[]): LatLng | null {
  const gps = features.map((f) => f.gps).filter((g): g is LatLng => g != null);
  if (gps.length === 0) return null;
  let lat = 0;
  let lon = 0;
  for (const g of gps) {
    lat += g.lat;
    lon += g.lon;
  }
  return { lat: lat / gps.length, lon: lon / gps.length };
}

/** 旅行の地名文脈（自宅から離れた地点の重心で、市レベルの半径で命名）。 */
function tripPlace(features: PhotoFeature[], home: LatLng | null): AlbumDraft['place'] {
  const far = home
    ? features.filter((f) => f.gps && haversineMeters(home, f.gps) > DEFAULT_TIMELINE.farMeters)
    : features;
  const centroid = placeCentroid(far.length ? far : features);
  if (!centroid) return null;
  return namePlace(centroid, home, CITY_NAME_RADIUS_M);
}

function dayPlace(features: PhotoFeature[], home: LatLng | null): AlbumDraft['place'] {
  const centroid = placeCentroid(features);
  if (!centroid) return null;
  return namePlace(centroid, home, PLACE_NAME_RADIUS_M);
}

/** 月ごとに回収。日時不明分は 1 つの「いつかの写真たち」に束ねる。全写真を必ずカバー。 */
function recoverMonthly(remaining: PhotoFeature[]): AlbumDraft[] {
  if (remaining.length === 0) return [];
  const byMonth = new Map<string, PhotoFeature[]>();
  const undated: PhotoFeature[] = [];
  for (const f of remaining) {
    if (f.takenAt == null) {
      undated.push(f);
      continue;
    }
    const d = new Date(f.takenAt);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    const arr = byMonth.get(key) ?? [];
    arr.push(f);
    byMonth.set(key, arr);
  }
  const out: AlbumDraft[] = [];
  for (const [key, group] of byMonth) {
    const [y, m] = key.split('-').map(Number);
    out.push({
      kind: 'monthly',
      photoIds: group.map((f) => f.id),
      coverId: pickCover(group),
      confidence: 'low',
      dateRange: dateRangeOf(group),
      monthKey: { year: y, month: m },
    });
  }
  if (undated.length > 0) {
    out.push({
      kind: 'monthly',
      photoIds: undated.map((f) => f.id),
      coverId: pickCover(undated),
      confidence: 'low',
    });
  }
  // 決定的な並び（新しい月順）
  out.sort((a, b) => {
    const am = a.monthKey ? a.monthKey.year * 12 + a.monthKey.month : -1;
    const bm = b.monthKey ? b.monthKey.year * 12 + b.monthKey.month : -1;
    return bm - am;
  });
  return out;
}

function collectSceneTags(
  photoIds: PhotoId[],
  sceneByPhoto: Map<PhotoId, string>,
  ownLabel: string | undefined,
): string[] {
  const counts = new Map<string, number>();
  for (const id of photoIds) {
    const label = sceneByPhoto.get(id);
    if (!label || label === ownLabel) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 3)
    .map(([label]) => label);
}

/** 表示用の信頼度ヘルパ（外部からも使えるよう公開）。 */
export function confidenceLabel(c: Confidence): string {
  return c === 'high' ? '高' : c === 'med' ? '中' : '低';
}
