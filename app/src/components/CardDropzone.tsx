import { useRef, useState, type ReactNode } from 'react';
import type { LoadedFile } from '../hooks/useRemapper';

export function CardDropzone({
  onFile,
  children,
}: {
  onFile: (f: LoadedFile) => void;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  async function handle(file: File) {
    const buf = await file.arrayBuffer();
    onFile({ bytes: new Uint8Array(buf), name: file.name });
  }

  return (
    <div
      className="relative"
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) void handle(f);
      }}
    >
      {children}
      {over && (
        <div className="
          pointer-events-none absolute inset-0 z-40 flex flex-col items-center
          justify-center gap-3.5 rounded-[18px] border-2 border-dashed
          border-accent/45 bg-card/85 backdrop-blur-[3px]
        ">
          <span className="
            flex size-12 items-center justify-center rounded-full border
            border-accent/40 font-display text-3xl leading-none text-accent
          ">
            +
          </span>
          <span className="font-mono text-[10px] tracking-[0.18em] text-t3">
            DROP .MID
          </span>
        </div>
      )}
    </div>
  );
}
