import { useCallback, useEffect, useRef } from 'react';

/**
 * object URL のレジストリ。
 *
 * URL は **File の同一性** をキーに管理する（写真 id は取り込みのたびに p0..pN と
 * 振り直されるため、id をキーにすると別バッチのファイルの URL を取り違える）。
 * WeakMap で File→URL を引きつつ、revoke 用に生成した URL を配列でも保持し、
 * リセット時・新規取り込み時・アンマウント時にまとめて revoke してリークを防ぐ。
 */
export function useObjectUrls() {
  const byFile = useRef(new WeakMap<File, string>());
  const created = useRef<string[]>([]);

  const urlFor = useCallback((file: File | undefined): string | undefined => {
    if (!file) return undefined;
    const existing = byFile.current.get(file);
    if (existing) return existing;
    const url = URL.createObjectURL(file);
    byFile.current.set(file, url);
    created.current.push(url);
    return url;
  }, []);

  const releaseAll = useCallback(() => {
    for (const url of created.current) URL.revokeObjectURL(url);
    created.current = [];
    byFile.current = new WeakMap();
  }, []);

  useEffect(() => () => releaseAll(), [releaseAll]);

  return { urlFor, releaseAll };
}
