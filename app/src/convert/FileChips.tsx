import type { ReactElement } from 'react';
import { useT } from '../locale/localeContext';
import type { FailedFile } from './batch';
import { errorReason } from '../core/errors';
import type { LoadedFile } from '../core/files';
import { track } from '../core/stats';
import { errorTitle } from '../ui/errorTitle';
import { FilePicker } from './FilePicker';
import { IconButton } from '../ui/IconButton';
import { MidBadge } from './MidBadge';
import { TextButton } from '../ui/TextButton';

const CHIP_TONE = {
  failed: 'border-danger/40 bg-danger/5',
  waiting: 'border-star/60 bg-star/8',
  ok: 'border-field-border bg-field',
} as const;

/** How a file's chip looks: failed over waiting for its drum parts over plain. */
function chipState(failed: boolean, waiting: boolean): keyof typeof CHIP_TONE {
  if (failed) return 'failed';
  return waiting ? 'waiting' : 'ok';
}

/** The files added: a chip per file, a button to add more and one to clear them all. */
export function FileChips({
  files,
  failures,
  waiting,
  onPick,
  onRemove,
  onClear,
  skippedLine,
}: {
  files: LoadedFile[];
  failures: FailedFile[];
  waiting: ReadonlySet<string>;
  onPick: () => void;
  onRemove: (name: string) => void;
  onClear: () => void;
  skippedLine: ReactElement | false;
}) {
  const t = useT();
  const failed = new Map(failures.map((f) => [f.name, f.error]));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {files.map((f) => {
        const failure = failed.get(f.name);
        const error = failure === undefined ? undefined : errorTitle(failure, t);
        const state = chipState(failure !== undefined, waiting.has(f.name));
        const needsParts = state === 'waiting' ? t({ id: 'error-needs-parts' }) : undefined;
        return (
          <div
            key={f.name}
            data-state={state}
            title={error ?? needsParts}
            className={`
              flex max-w-full items-center gap-1.5 rounded-full border py-1
              pr-1.5 pl-3 transition-colors
              ${CHIP_TONE[state]}
            `}
          >
            <MidBadge />
            <span className="h-3.5 w-px shrink-0 bg-white/12" />
            <span className="min-w-0 truncate text-ui text-t1">{f.name}</span>
            {failure !== undefined && (
              <span className="shrink-0 text-label text-danger">{t({ id: 'files-failed-reason', args: { reason: errorReason(failure) } })}</span>
            )}
            {needsParts !== undefined && <span className="sr-only">{needsParts}</span>}
            <IconButton
              label={t({ id: 'files-remove', args: { name: f.name } })}
              size="sm"
              tone="danger"
              onClick={() => {
                track('file-removed', { all: false });
                onRemove(f.name);
              }}
            >
              ×
            </IconButton>
          </div>
        );
      })}
      <FilePicker onPick={onPick} fullWidth={false}>
        <span className="
          inline-flex items-center rounded-full border border-dashed
          border-accent/35 px-3.5 py-1 text-ui text-star/85 transition-colors
          hover:border-accent/70 hover:text-star
          pointer-coarse:min-h-11
        "
        >{t({ id: 'files-add-more' })}
        </span>
      </FilePicker>
      <div className="ml-auto">
        <TextButton
          tone="danger"
          onClick={() => {
            track('file-removed', { all: true });
            onClear();
          }}
        >{t({ id: 'files-clear' })}
        </TextButton>
      </div>
      {skippedLine}
    </div>
  );
}
