import { useCallback, useRef, useState } from 'react';
import type { Album, PhotoFeature } from '../../core/types';
import { buildAlbums } from '../../pipeline/buildAlbums';
import { makeDemoFeatures } from '../../pipeline/demoData';
import { analyzeFiles, type AnalyzeProgress, type SkippedPhoto } from '../../workers/decodeClient';

export type PipelineState = 'empty' | 'analyzing' | 'result';

export interface PipelineApi {
  state: PipelineState;
  albums: Album[];
  progress: AnalyzeProgress;
  phase: string;
  skipped: SkippedPhoto[];
  featuresById: Map<string, PhotoFeature>;
  fileById: Map<string, File>;
  isDemo: boolean;
  run: (files: File[]) => Promise<void>;
  runDemo: () => Promise<void>;
  reset: () => void;
}

const EMPTY_PROGRESS: AnalyzeProgress = { done: 0, total: 0 };
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function usePhotoPipeline(onReset?: () => void): PipelineApi {
  const [state, setState] = useState<PipelineState>('empty');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [progress, setProgress] = useState<AnalyzeProgress>(EMPTY_PROGRESS);
  const [phase, setPhase] = useState('読み込み中');
  const [skipped, setSkipped] = useState<SkippedPhoto[]>([]);
  const [featuresById, setFeaturesById] = useState<Map<string, PhotoFeature>>(new Map());
  const [fileById, setFileById] = useState<Map<string, File>>(new Map());
  const [isDemo, setIsDemo] = useState(false);
  const runId = useRef(0);

  const finish = useCallback((features: PhotoFeature[], files: Map<string, File>, skips: SkippedPhoto[], demo: boolean) => {
    setPhase('まとめています');
    const built = buildAlbums(features, { seed: 42 });
    setFeaturesById(new Map(features.map((f) => [f.id, f])));
    setFileById(files);
    setSkipped(skips);
    setAlbums(built);
    setIsDemo(demo);
    setState('result');
  }, []);

  const run = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const my = ++runId.current;
      setIsDemo(false);
      setState('analyzing');
      setPhase('写真を見ています');
      setProgress({ done: 0, total: files.length });
      const { features, skipped: skips, fileById: files2 } = await analyzeFiles(files, (p) => {
        if (my === runId.current) setProgress(p);
      });
      if (my !== runId.current) return;
      finish(features, files2, skips, false);
    },
    [finish],
  );

  const runDemo = useCallback(async () => {
    const my = ++runId.current;
    setIsDemo(true);
    setState('analyzing');
    setPhase('サンプルを読み込み中');
    const feats = makeDemoFeatures(42);
    const total = feats.length;
    // 演出用の軽い進捗アニメーション（実処理は一瞬）
    for (let done = 0; done <= total; done += Math.ceil(total / 6)) {
      if (my !== runId.current) return;
      setProgress({ done: Math.min(done, total), total });
      setPhase(done < total * 0.5 ? '写真を見ています' : '特徴をしらべています');
      await delay(90);
    }
    if (my !== runId.current) return;
    finish(feats, new Map(), [], true);
  }, [finish]);

  const reset = useCallback(() => {
    runId.current++;
    setState('empty');
    setAlbums([]);
    setProgress(EMPTY_PROGRESS);
    setSkipped([]);
    setFeaturesById(new Map());
    setFileById(new Map());
    setIsDemo(false);
    onReset?.();
  }, [onReset]);

  return { state, albums, progress, phase, skipped, featuresById, fileById, isDemo, run, runDemo, reset };
}
