import type { FileFailure, LoadedFile } from '../lib/files';
import { FilePicker } from './FilePicker';
import { MidBadge } from './MidBadge';

export function FileChips({
  files,
  failures,
  onFiles,
  onRemove,
  onClear,
}: {
  files: LoadedFile[];
  failures: FileFailure[];
  onFiles: (files: LoadedFile[]) => void;
  onRemove: (name: string) => void;
  onClear: () => void;
}) {
  if (files.length === 0) {
    return (
      <FilePicker onFiles={onFiles}>
        <div className="flex items-center gap-3 border-b border-hairline pb-4.5">
          <MidBadge />
          <span className="flex-1 text-[14px] text-t4">
            Drop a .mid anywhere, or click to choose
          </span>
        </div>
      </FilePicker>
    );
  }
  const failed = new Map(failures.map((f) => [f.name, f.error]));
  return (
    <div className="
      flex flex-wrap items-center gap-2 border-b border-hairline pb-4.5
    ">
      {files.map((f) => {
        const error = failed.get(f.name);
        const bad = error !== undefined;
        return (
          <div
            key={f.name}
            data-state={bad ? 'failed' : 'ok'}
            title={error}
            className={`
              flex max-w-full items-center gap-1.5 rounded-[7px] border py-1
              pr-1.5 pl-2.5
              ${
                bad
                  ? 'border-danger/40 bg-danger/5'
                  : `border-field-border bg-field`
              }
            `}
          >
            <MidBadge />
            <span className="h-3.5 w-px shrink-0 bg-white/12" />
            <span className="min-w-0 truncate text-[12px] text-t1">{f.name}</span>
            <button
              type="button"
              aria-label={`Remove ${f.name}`}
              onClick={() => onRemove(f.name)}
              className="
                flex size-4 shrink-0 items-center justify-center rounded-full
                text-[12px] leading-none text-t5
                hover:bg-white/8 hover:text-danger
              "
            >
              ×
            </button>
          </div>
        );
      })}
      <div className="flex w-full items-center justify-between pt-0.5">
        <FilePicker onFiles={onFiles} fullWidth={false}>
          <span className="
            text-[11px] text-t5
            hover:text-accent
          ">
            + add more
          </span>
        </FilePicker>
        <button
          type="button"
          onClick={onClear}
          className="
            text-[11px] text-danger/60 transition-colors
            hover:text-danger
          "
        >
          clear all
        </button>
      </div>
    </div>
  );
}
