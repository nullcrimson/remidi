import { useRef, type ReactNode } from 'react';
import type { FocusRef } from '../hooks/useFocusIntent';
import { takeFiles, type OnFiles } from '../lib/files';

export function FilePicker({
  onFiles,
  children,
  fullWidth = true,
  ref,
}: {
  ref?: FocusRef;
  onFiles: OnFiles;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        ref={ref}
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
