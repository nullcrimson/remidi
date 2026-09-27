import type { FileFailure, LoadedFile, OnFiles } from '../lib/files';
import { FilePicker } from './FilePicker';
import { IconButton } from './IconButton';
import { MidBadge } from './MidBadge';
import { textAction } from './styles';
import { TextButton } from './TextButton';

export function FileChips({
  files,
  failures,
  skipped = [],
  onFiles,
  onRemove,
  onClear,
}: {
  files: LoadedFile[];
  failures: FileFailure[];
  skipped?: string[];
  onFiles: OnFiles;
  onRemove: (name: string) => void;
  onClear: () => void;
}) {
  const skippedLine = skipped.length > 0 && (
    <p role="status" className="w-full text-label text-t4">
      Skipped {skipped.join(', ')} — only .mid and .midi files
    </p>
  );
  if (files.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <FilePicker onFiles={onFiles}>
          <div className="
            flex items-center gap-3 border-b border-hairline pb-4.5
          "
          >
            <MidBadge />
            <span className="flex-1 text-body text-t4">
              Drop a .mid anywhere, or click to choose
            </span>
          </div>
        </FilePicker>
        {skippedLine}
      </div>
    );
  }
  const failed = new Map(failures.map((f) => [f.name, f.error]));
  return (
    <div className="
      flex flex-wrap items-center gap-2 border-b border-hairline pb-4.5
    "
    >
      {files.map((f) => {
        const error = failed.get(f.name);
        const bad = error !== undefined;
        return (
          <div
            key={f.name}
            data-state={bad ? 'failed' : 'ok'}
            title={error}
            className={`
              flex max-w-full items-center gap-1.5 rounded-chip border py-1
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
            <span className="min-w-0 truncate text-ui text-t1">{f.name}</span>
            <IconButton label={`Remove ${f.name}`} size="sm" tone="danger" onClick={() => onRemove(f.name)}>
              ×
            </IconButton>
          </div>
        );
      })}
      <div className="flex w-full items-center justify-between pt-0.5">
        <FilePicker onFiles={onFiles} fullWidth={false}>
          <span className={textAction()}>+ add more</span>
        </FilePicker>
        <TextButton tone="danger" onClick={onClear}>clear all</TextButton>
      </div>
      {skippedLine}
    </div>
  );
}
