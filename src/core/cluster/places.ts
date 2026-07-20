import type { LatLng, PhotoFeature, PhotoId } from '../types';
import { dbscan } from '../geo/dbscan';
import { haversineMeters } from '../geo/haversine';

export interface PlacesOptions {
  epsMeters: number;
  minPts: number;
}

export const DEFAULT_PLACES: PlacesOptions = {
  epsMeters: 500,
  minPts: 3,
};

export interface PlaceCluster {
  photoIds: PhotoId[];
  centroid: LatLng;
  startAt: number | null;
  endAt: number | null;
}

/**
 * GPS 付き写真をハバサイン距離 DBSCAN（eps=500m, minPts=3）で「場所」に束ねる。
 * GPS が 1 枚も無ければ空配列（無害スキップ）。
 */
export function buildPlaces(
  features: PhotoFeature[],
  opts: PlacesOptions = DEFAULT_PLACES,
): PlaceCluster[] {
  const geo = features.filter((f): f is PhotoFeature & { gps: LatLng } => f.gps != null);
  if (geo.length === 0) return [];

  const labels = dbscan(
    geo.map((f) => f.gps),
    opts.epsMeters,
    opts.minPts,
    haversineMeters,
  );

  const byCluster = new Map<number, (PhotoFeature & { gps: LatLng })[]>();
  for (let i = 0; i < geo.length; i++) {
    const c = labels[i];
    if (c < 0) continue; // noise
    const arr = byCluster.get(c) ?? [];
    arr.push(geo[i]);
    byCluster.set(c, arr);
  }

  const clusters: PlaceCluster[] = [];
  for (const members of byCluster.values()) {
    let sumLat = 0;
    let sumLon = 0;
    const times: number[] = [];
    for (const m of members) {
      sumLat += m.gps.lat;
      sumLon += m.gps.lon;
      if (m.takenAt != null) times.push(m.takenAt);
    }
    clusters.push({
      photoIds: members.map((m) => m.id).sort(),
      centroid: { lat: sumLat / members.length, lon: sumLon / members.length },
      startAt: times.length ? Math.min(...times) : null,
      endAt: times.length ? Math.max(...times) : null,
    });
  }

  // 決定的な並び（開始時刻→緯度→経度）
  clusters.sort((a, b) => {
    const at = a.startAt ?? Infinity;
    const bt = b.startAt ?? Infinity;
    if (at !== bt) return at - bt;
    if (a.centroid.lat !== b.centroid.lat) return a.centroid.lat - b.centroid.lat;
    return a.centroid.lon - b.centroid.lon;
  });
  return clusters;
}
