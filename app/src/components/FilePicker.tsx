import { useRef, type ReactNode } from 'react';
import { takeFiles, type OnFiles } from '../lib/files';

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
        accept=".mid,.midi,.json"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void takeFiles(Array.from(e.target.files), onFiles);
          e.target.value = '';
        }}
      />
    </>
  );
}
