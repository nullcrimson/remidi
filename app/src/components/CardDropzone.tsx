import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isMid, loadFiles, type LoadedFile } from '../lib/files';

export function CardDropzone({
  onFiles,
  children,
}: {
  onFiles: (files: LoadedFile[]) => void;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      e.preventDefault();
      depth.current += 1;
      setOver(true);
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onLeave = () => {
      depth.current -= 1;
      if (depth.current <= 0) {
        depth.current = 0;
        setOver(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      const dropped = Array.from(e.dataTransfer?.files ?? []).filter((f) => isMid(f.name));
      if (!dropped.length) return;
      void loadFiles(dropped).then(onFiles);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [onFiles]);

  return (
    <>
      {children}
      {over && (
        <div className="
          pointer-events-none fixed inset-0 z-50 flex flex-col items-center
          justify-center gap-3.5 bg-page/80 backdrop-blur-[3px]
        "
        >
          <div className="
            flex flex-col items-center gap-3.5 rounded-card border-2
            border-dashed border-accent/45 px-16 py-12
          "
          >
            <span className="
              flex size-12 items-center justify-center rounded-full border
              border-accent/40 font-display text-3xl leading-none text-accent
            "
            >
              +
            </span>
            <span className="font-mono text-[10px] tracking-[0.18em] text-t3">
              DROP .MID
            </span>
          </div>
        </div>
      )}
    </>
  );
}
