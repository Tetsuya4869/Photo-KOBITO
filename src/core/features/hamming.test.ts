import { describe, it, expect } from 'vitest';
import { hamming } from './hamming';

describe('hamming', () => {
  it('同一ハッシュは距離0', () => {
    expect(hamming('0000000000000000', '0000000000000000')).toBe(0);
    expect(hamming('ffffffffffffffff', 'ffffffffffffffff')).toBe(0);
  });
  it('全ビット反転は64', () => {
    expect(hamming('0000000000000000', 'ffffffffffffffff')).toBe(64);
  });
  it('1ビット差', () => {
    expect(hamming('0000000000000000', '0000000000000001')).toBe(1);
    expect(hamming('0000000000000000', '8000000000000000')).toBe(1);
  });
  it('上位・下位ワードをまたぐ差を正しく数える', () => {
    // 上位に1ビット、下位に2ビット
    expect(hamming('0000000100000003', '0000000000000000')).toBe(3);
  });
  it('対称性', () => {
    expect(hamming('a1b2c3d4e5f60718', '1122334455667788')).toBe(
      hamming('1122334455667788', 'a1b2c3d4e5f60718'),
    );
  });
  it('長さ不正は最大距離扱い', () => {
    expect(hamming('abc', '0000000000000000')).toBe(64);
  });
});
