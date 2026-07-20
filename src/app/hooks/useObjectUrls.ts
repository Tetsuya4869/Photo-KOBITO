import { useCallback, useEffect, useRef } from 'react';

/**
 * object URL のレジストリ。File から作った URL を id 単位でキャッシュし、
 * リセット時・アンマウント時にまとめて revoke してリークを防ぐ。
 * （デモの写真は data URL を使うため、ここは実ファイル取り込み時のみ働く）
 */
export function useObjectUrls() {
  const cache = useRef(new Map<string, string>());

  const urlFor = useCallback((id: string, file: File | undefined): string | undefined => {
    if (!file) return undefined;
    const c = cache.current;
    const existing = c.get(id);
    if (existing) return existing;
    const url = URL.createObjectURL(file);
    c.set(id, url);
    return url;
  }, []);

  const releaseAll = useCallback(() => {
    for (const url of cache.current.values()) URL.revokeObjectURL(url);
    cache.current.clear();
  }, []);

  useEffect(() => () => releaseAll(), [releaseAll]);

  return { urlFor, releaseAll };
}
