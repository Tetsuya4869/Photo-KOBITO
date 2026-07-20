import type { Album } from '../../core/types';
import { AlbumCard } from './AlbumCard';

export interface AlbumGridProps {
  albums: Album[];
  thumbFor: (id: string) => string | undefined;
  onOpen: (album: Album) => void;
}

export function AlbumGrid({ albums, thumbFor, onOpen }: AlbumGridProps) {
  return (
    <div className="album-grid">
      {albums.map((a) => (
        <AlbumCard key={a.id} album={a} thumbFor={thumbFor} onOpen={onOpen} />
      ))}
    </div>
  );
}
