import type { Album } from '../../core/types';
import { fmtDateRange, confidenceDots, confidenceWord } from '../format';
import { ReasonChip } from './ReasonChip';

export interface AlbumCardProps {
  album: Album;
  thumbFor: (id: string) => string | undefined;
  onOpen: (album: Album) => void;
}

export function AlbumCard({ album, thumbFor, onOpen }: AlbumCardProps) {
  const cover = thumbFor(album.coverId);
  const dots = confidenceDots(album.confidence);
  return (
    <div className={`album-card album-card--${album.confidence}`}>
      <button className="album-cover-btn" onClick={() => onOpen(album)} aria-label={`${album.title} を開く`}>
        {cover ? (
          <img className="album-cover" src={cover} alt="" loading="lazy" />
        ) : (
          <div className="album-cover album-cover--none" aria-hidden="true">
            {album.emoji}
          </div>
        )}
        <span className="album-count">{album.photoIds.length}枚</span>
      </button>
      <div className="album-body">
        <h3 className="album-title">
          <span className="album-emoji" aria-hidden="true">
            {album.emoji}
          </span>
          {album.title}
        </h3>
        <div className="album-sub">
          <span>{fmtDateRange(album.dateRange)}</span>
          {album.sceneTags.length > 0 && (
            <span className="album-tags">
              {album.sceneTags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="conf-dots" title={confidenceWord(album.confidence)} aria-label={`確信度: ${confidenceWord(album.confidence)}`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`dot ${i < dots ? 'dot--on' : ''}`} />
          ))}
        </div>
        <ReasonChip reason={album.reason} />
      </div>
    </div>
  );
}
