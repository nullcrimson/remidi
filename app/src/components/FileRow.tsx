import type { LoadedFile } from '../hooks/useRemapper';
import { FilePicker } from './FilePicker';

export function FileRow({
  file,
  onFile,
  onReplace,
}: {
  file: LoadedFile | null;
  onFile: (f: LoadedFile) => void;
  onReplace: () => void;
}) {
  if (!file) {
    return (
      <FilePicker onFile={onFile}>
        <div className="flex items-center gap-3 border-b border-white/6 pb-4.5">
          <span className="font-mono text-[11px] font-semibold text-accent">MID</span>
          <span className="flex-1 text-[14px] text-t4">
            Drop a .mid anywhere, or click to choose
          </span>
        </div>
      </FilePicker>
    );
  }
  return (
    <div className="flex items-center gap-3 border-b border-white/6 pb-4.5">
      <span className="font-mono text-[11px] font-semibold text-accent">MID</span>
      <span className="flex-1 truncate text-[14px] text-t1">{file.name}</span>
      <button type="button" onClick={onReplace} className="
        text-[12px] text-t4
        hover:text-danger
      ">
        replace
      </button>
    </div>
  );
}
