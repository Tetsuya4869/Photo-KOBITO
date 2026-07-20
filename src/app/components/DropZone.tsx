import { useEffect, useRef, useState } from 'react';

export interface DropZoneProps {
  onFiles: (files: File[]) => void;
}

/**
 * 画面全体を覆うドラッグ＆ドロップの受け皿。ウィンドウのドラッグを監視し、
 * 画像ファイルがドロップされたら onFiles に渡す。
 */
export function DropZone({ onFiles }: DropZoneProps) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const hasFiles = Array.from(e.dataTransfer.types).includes('Files');
      if (!hasFiles) return;
      e.preventDefault();
      depth.current += 1;
      setOver(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      if (!e.dataTransfer) return;
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length) onFiles(files);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [onFiles]);

  if (!over) return null;
  return (
    <div className="dropzone-overlay" aria-hidden="true">
      <div className="dropzone-inner">
        <div className="dropzone-emoji">📥</div>
        <p>ここに写真をドロップ</p>
      </div>
    </div>
  );
}
