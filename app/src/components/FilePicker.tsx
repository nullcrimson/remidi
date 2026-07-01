import { useRef, type ReactNode } from 'react';
import type { LoadedFile } from '../hooks/useRemapper';

export function FilePicker({
  onFile,
  children,
}: {
  onFile: (f: LoadedFile) => void;
  children: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(file: File) {
    const buf = await file.arrayBuffer();
    onFile({ bytes: new Uint8Array(buf), name: file.name });
  }

  return (
    <>
      <button type="button" className="w-full text-left" onClick={() => inputRef.current?.click()}>
        {children}
      </button>
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
        }}
      />
    </>
  );
}
