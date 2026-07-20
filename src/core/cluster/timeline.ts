import type { LatLng, PhotoFeature, PhotoId } from '../types';
import { haversineMeters } from '../geo/haversine';

const HOUR = 3_600_000;
const DAY = 86_400_000;

export interface TimelineOptions {
  sessionGapMs: number;
  dayBridgeMs: number;
  tripMinDays: number;
  tripMinPhotos: number;
  minEventPhotos: number;
  farMeters: number;
}

export const DEFAULT_TIMELINE: TimelineOptions = {
  sessionGapMs: 4 * HOUR,
  dayBridgeMs: 18 * HOUR,
  tripMinDays: 2,
  tripMinPhotos: 20,
  minEventPhotos: 5,
  farMeters: 30_000,
};

export interface TimeCluster {
  kind: 'trip' | 'day';
  photoIds: PhotoId[];
  startAt: number;
  endAt: number;
  /** この塊に含まれる（壁時計=UTC の）暦日インデックスの種類数。 */
  dayCount: number;
  /** 旅行の宿泊数（trip なら dayCount-1、day は 0）。 */
  nights: number;
  /** 連写重複を除いてカウントした実質枚数（アルバム化判定に使う）。 */
  countedCount: number;
}

interface Session {
  items: PhotoFeature[];
  startAt: number;
  endAt: number;
  startDay: number;
}

/** 壁時計=UTC ms から暦日インデックス。 */
function dayIndex(ms: number): number {
  return Math.floor(ms / DAY);
}

/**
 * session → day → trip の 2 段クラスタリング。
 * countedIds は「実質枚数」を数える対象（連写の代表以外を除いた集合）。未指定なら全件。
 */
export function buildTimeline(
  features: PhotoFeature[],
  home: LatLng | null,
  opts: TimelineOptions = DEFAULT_TIMELINE,
  countedIds?: Set<PhotoId>,
): TimeCluster[] {
  const timed = features
    .filter((f) => f.takenAt != null)
    .slice()
    .sort((a, b) => (a.takenAt as number) - (b.takenAt as number) || (a.id < b.id ? -1 : 1));
  if (timed.length === 0) return [];

  const counts = (ids: PhotoId[]) =>
    countedIds ? ids.reduce((s, id) => s + (countedIds.has(id) ? 1 : 0), 0) : ids.length;

  // --- 1. セッション分割（gap > sessionGap）。深夜またぎのセッションはそのまま保つ ---
  const sessions: Session[] = [];
  let cur: PhotoFeature[] = [timed[0]];
  for (let i = 1; i < timed.length; i++) {
    const gap = (timed[i].takenAt as number) - (timed[i - 1].takenAt as number);
    if (gap > opts.sessionGapMs) {
      sessions.push(makeSession(cur));
      cur = [];
    }
    cur.push(timed[i]);
  }
  sessions.push(makeSession(cur));

  // --- 2. 同一開始暦日のセッションを day クラスタに束ねる ---
  const dayClusters: Session[][] = [];
  for (const s of sessions) {
    const last = dayClusters[dayClusters.length - 1];
    if (last && last[0].startDay === s.startDay) {
      last.push(s);
    } else {
      dayClusters.push([s]);
    }
  }

  interface Day {
    items: PhotoFeature[];
    startAt: number;
    endAt: number;
    dayIdx: number;
  }
  const days: Day[] = dayClusters.map((group) => {
    const items = group.flatMap((s) => s.items);
    return {
      items,
      startAt: group[0].startAt,
      endAt: group[group.length - 1].endAt,
      dayIdx: group[0].startDay,
    };
  });

  // --- 3. 連続する day を run に束ね（gap <= dayBridge）、trip 昇格を判定 ---
  const result: TimeCluster[] = [];
  let run: Day[] = [days[0]];
  const flushRun = () => {
    const items = run.flatMap((d) => d.items);
    const ids = items.map((f) => f.id);
    const startAt = run[0].startAt;
    const endAt = run[run.length - 1].endAt;
    const dayCount = new Set(run.map((d) => d.dayIdx)).size;
    const counted = counts(ids);
    const isTrip =
      dayCount >= opts.tripMinDays &&
      counted >= opts.tripMinPhotos &&
      farEnough(items, home, opts.farMeters);

    if (isTrip) {
      result.push({
        kind: 'trip',
        photoIds: ids,
        startAt,
        endAt,
        dayCount,
        nights: dayCount - 1,
        countedCount: counted,
      });
    } else {
      // trip でなければ、run 内の各 day を個別の day イベントに戻す
      for (const d of run) {
        const dIds = d.items.map((f) => f.id);
        result.push({
          kind: 'day',
          photoIds: dIds,
          startAt: d.startAt,
          endAt: d.endAt,
          dayCount: 1,
          nights: 0,
          countedCount: counts(dIds),
        });
      }
    }
    run = [];
  };

  for (let i = 1; i < days.length; i++) {
    const gap = days[i].startAt - days[i - 1].endAt;
    if (gap > opts.dayBridgeMs) {
      flushRun();
      run = [days[i]];
    } else {
      run.push(days[i]);
    }
  }
  flushRun();

  return result;
}

function makeSession(items: PhotoFeature[]): Session {
  const startAt = items[0].takenAt as number;
  const endAt = items[items.length - 1].takenAt as number;
  return { items, startAt, endAt, startDay: dayIndex(startAt) };
}

/**
 * home が判定基準。
 *  - home が無ければ far 判定不能 → 許可（true）
 *  - home があり、GPS 付き写真が run に 1 枚も無ければ判定不能 → 許可（true）
 *  - home があり GPS 付き写真があるなら、そのどれかが far を超えるときのみ true
 */
function farEnough(items: PhotoFeature[], home: LatLng | null, farMeters: number): boolean {
  if (!home) return true;
  const withGps = items.filter((f) => f.gps);
  if (withGps.length === 0) return true;
  return withGps.some((f) => haversineMeters(home, f.gps as LatLng) > farMeters);
}
