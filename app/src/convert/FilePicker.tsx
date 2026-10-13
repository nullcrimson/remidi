import { useRef, type ReactNode } from 'react';
import type { FocusRef } from '../ui/useFocusIntent';
import { ACCEPT_EXTENSIONS, takeFiles, type OnFiles } from '../core/files';

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
        accept={ACCEPT_EXTENSIONS}
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
