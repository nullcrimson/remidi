import { useRef, type ReactNode } from 'react';
import { loadFiles, splitMid, type OnFiles } from '../lib/files';

export function FilePicker({
  onFiles,
  children,
  fullWidth = true,
  id,
}: {
  id?: string;
  onFiles: OnFiles;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(list: FileList) {
    const { mid, skipped } = splitMid(Array.from(list));
    if (mid.length || skipped.length) onFiles(await loadFiles(mid), skipped);
  }

  return (
    <>
      <button
        id={id}
        type="button"
        className={`
          cursor-pointer text-left
          ${fullWidth ? 'w-full' : 'tap'}
        `}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept=".mid,.midi"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handle(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}
