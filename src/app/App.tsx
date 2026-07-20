import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import type { Album } from '../core/types';
import { usePhotoPipeline } from './hooks/usePhotoPipeline';
import { useObjectUrls } from './hooks/useObjectUrls';
import { EmptyState } from './components/EmptyState';
import { ProgressCurtain } from './components/ProgressCurtain';
import { AlbumGrid } from './components/AlbumGrid';
import { PhotoLightbox } from './components/PhotoLightbox';
import { DropZone } from './components/DropZone';
import { PrivacyBadge } from './components/PrivacyBadge';
import { KobitoMascot } from './components/KobitoMascot';

export function App() {
  const { urlFor, releaseAll } = useObjectUrls();
  const { state, albums, progress, phase, skipped, featuresById, fileById, isDemo, run, runDemo, reset } =
    usePhotoPipeline(releaseAll);
  const [selected, setSelected] = useState<Album | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const thumbFor = useCallback(
    (id: string): string | undefined => featuresById.get(id)?.coverThumb ?? urlFor(id, fileById.get(id)),
    [featuresById, fileById, urlFor],
  );

  const onFiles = useCallback(
    (files: File[]) => {
      setSelected(null);
      void run(files);
    },
    [run],
  );

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = '';
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  const handleReset = useCallback(() => {
    setSelected(null);
    reset();
  }, [reset]);

  return (
    <div className="app">
      <DropZone onFiles={onFiles} />
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onInputChange} />

      <header className="app-header">
        <button type="button" className="brand" onClick={handleReset}>
          <KobitoMascot size={30} />
          <span>フォトこびと</span>
        </button>
        {state === 'result' && (
          <div className="header-actions">
            <PrivacyBadge compact />
            <button type="button" className="btn btn-small" onClick={openPicker}>
              ＋写真を追加
            </button>
            <button type="button" className="btn btn-small btn-ghost" onClick={handleReset}>
              最初から
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {state === 'empty' && <EmptyState onPickFiles={openPicker} onDemo={runDemo} />}
        {state === 'analyzing' && <ProgressCurtain progress={progress} phase={phase} />}
        {state === 'result' && (
          <>
            <div className="result-head">
              <KobitoMascot size={64} />
              <div>
                <p className="result-title">
                  {isDemo ? 'サンプルの' : 'あなたの'}
                  {featuresById.size}枚を、{albums.length}個のアルバムにまとめたよ！
                </p>
                {isDemo && (
                  <p className="demo-note">これはサンプルです。「＋写真を追加」で自分の写真も試せます。</p>
                )}
                {skipped.length > 0 && (
                  <p className="skip-note">
                    {skipped.length}枚はこの端末で開けなかったので、日付と場所だけそっと拝借したよ（HEIC など）。
                  </p>
                )}
              </div>
            </div>
            <AlbumGrid albums={albums} thumbFor={thumbFor} onOpen={setSelected} />
          </>
        )}
      </main>

      {selected && <PhotoLightbox album={selected} thumbFor={thumbFor} onClose={() => setSelected(null)} />}
    </div>
  );
}
