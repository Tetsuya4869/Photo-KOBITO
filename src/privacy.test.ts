import { describe, it, expect } from 'vitest';

/**
 * プライバシー公約の構造的強制。
 *
 * 「写真はどこにも送信しない」を人手のレビューだけに頼らず、ビルドを落とすテストで守る。
 * src 配下のアプリコードに、通信を発生させる API（fetch / XMLHttpRequest / WebSocket /
 * sendBeacon / EventSource）や、位置情報 API（navigator.geolocation）が現れないことを検証する。
 * これらは 1 つでも混入するとプライバシーの核心が崩れるため、依存追加時の回帰も含めて機械的に検出する。
 *
 * ソースは Vite の import.meta.glob で raw 文字列として読み込むため、Node の fs に依存しない。
 */

const modules = import.meta.glob('./**/*.{ts,tsx}', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

const sources = Object.entries(modules).filter(([path]) => !/\.test\.ts$/.test(path));

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: 'fetch()', re: /\bfetch\s*\(/ },
  { name: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/ },
  { name: 'WebSocket', re: /\bWebSocket\b/ },
  { name: 'navigator.sendBeacon', re: /\bsendBeacon\b/ },
  { name: 'EventSource', re: /\bEventSource\b/ },
  { name: 'navigator.geolocation', re: /\bgeolocation\b/ },
];

describe('プライバシー: 通信 API が混入していない', () => {
  it('src 配下のソースを読み込めている（自己テスト）', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  for (const { name, re } of FORBIDDEN) {
    it(`${name} を使っていない`, () => {
      const offenders = sources.filter(([, text]) => re.test(text)).map(([path]) => path);
      expect(offenders, `禁止 API "${name}" が見つかりました: ${offenders.join(', ')}`).toEqual([]);
    });
  }
});
