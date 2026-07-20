import { useEffect } from 'react';
import type { Album } from '../../core/types';

export interface PhotoLightboxProps {
  album: Album;
  thumbFor: (id: string) => string | undefined;
  onClose: () => void;
}

/**
 * アルバムを開いて中の写真を一覧するモーダル。原本は一切改変しないことを明示。
 * バーストのベスト1枚（cover）を先頭でハイライトする。
 */
export function PhotoLightbox({ album, thumbFor, onClose }: PhotoLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // cover を先頭に
  const ids = [album.coverId, ...album.photoIds.filter((id) => id !== album.coverId)];

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={album.title} onClick={onClose}>
      <div className="lightbox-panel" onClick={(e) => e.stopPropagation()}>
        <header className="lightbox-header">
          <div>
            <h2 className="lightbox-title">
              <span aria-hidden="true">{album.emoji}</span> {album.title}
            </h2>
            <p className="lightbox-reason">{album.reason}</p>
          </div>
          <button type="button" className="lightbox-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="lightbox-grid">
          {ids.map((id, i) => {
            const src = thumbFor(id);
            return (
              <div key={id} className={`lightbox-thumb ${i === 0 ? 'lightbox-thumb--cover' : ''}`}>
                {src ? (
                  <img src={src} alt="" loading="lazy" />
                ) : (
                  <div className="lightbox-thumb--none" aria-hidden="true">
                    {album.emoji}
                  </div>
                )}
                {i === 0 && <span className="lightbox-best">ベスト</span>}
              </div>
            );
          })}
        </div>
        <p className="lightbox-note">※ 表示はコピーです。元の写真は変更していません。</p>
      </div>
    </div>
  );
}
