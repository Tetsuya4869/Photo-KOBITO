/**
 * 純粋な並行度計画。count 個のタスクを、同時 concurrency 個ずつ処理するための
 * インデックスのバッチ列に分割する。UI/worker 層はこの計画に従って
 * デコードを流し、メモリと応答性を保つ。
 */
export function planBatches(count: number, concurrency: number): number[][] {
  const c = Math.max(1, Math.floor(concurrency));
  const batches: number[][] = [];
  for (let i = 0; i < count; i += c) {
    const batch: number[] = [];
    for (let j = i; j < Math.min(i + c, count); j++) batch.push(j);
    batches.push(batch);
  }
  return batches;
}

/** 端末の論理コア数から妥当な同時デコード数を選ぶ（1..4）。 */
export function defaultConcurrency(hardwareConcurrency: number | undefined): number {
  const hc = hardwareConcurrency && hardwareConcurrency > 0 ? hardwareConcurrency : 4;
  return Math.max(1, Math.min(4, hc));
}
