import { useId } from 'react';
import { useT } from '../locale/localeContext';
import type { FailedFile } from './batch';
import type { LoadedFile, OnFiles } from '../core/files';
import { track } from '../core/stats';
import { errorTitle } from '../ui/errorTitle';
import type { FocusRef } from '../ui/useFocusIntent';
import { FilePicker } from './FilePicker';
import { IconButton } from '../ui/IconButton';
import { MidBadge } from './MidBadge';
import { textAction } from '../ui/styles';
import { TextButton } from '../ui/TextButton';

export function FileChips({
  files,
  failures,
  skipped = [],
  onFiles,
  onRemove,
  onClear,
  onTrySample,
  pickerRef,
}: {
  pickerRef?: FocusRef;
  onTrySample?: () => void;
  files: LoadedFile[];
  failures: FailedFile[];
  skipped?: string[];
  onFiles: OnFiles;
  onRemove: (name: string) => void;
  onClear: () => void;
}) {
  const t = useT();
  const sampleHint = useId();
  const skippedLine = skipped.length > 0 && (
    <p role="status" className="w-full text-label text-t4">
      {t({ id: 'files-skipped', args: { names: skipped.join(', ') } })}
    </p>
  );
  if (files.length === 0) {
    return (
      <div className="flex flex-col gap-2 border-b border-hairline pb-4.5">
        <FilePicker ref={pickerRef} onFiles={onFiles}>
          <div className="
            group flex flex-wrap items-center gap-3 rounded-panel border
            border-dashed border-white/15 px-4 py-3.5 transition-colors
            hover:border-accent/60 hover:bg-accent/4
            in-focus-visible:border-accent/60
          "
          >
            <MidBadge />
            <span className="flex-1 text-body text-t3">
              {t({ id: 'files-drop' })}
            </span>
            {' '}
            <span className="
              inline-flex items-center justify-center rounded-chip border
              border-accent/40 px-3 py-1.5 font-display text-ui font-semibold
              text-accent transition
              group-hover:border-accent group-hover:bg-accent/8
              max-sm:w-full
              pointer-coarse:min-h-11
            "
            >
              {t({ id: 'files-choose' })}
            </span>
          </div>
        </FilePicker>
        <div className="flex flex-wrap items-center gap-x-3">
          <TextButton
            onClick={() => onTrySample?.()}
            disabled={onTrySample === undefined}
            describedBy={onTrySample === undefined ? sampleHint : undefined}
          >
            {t({ id: 'files-sample' })}
          </TextButton>
          {onTrySample === undefined && (
            <span id={sampleHint} className="text-label text-t5">
              {t({ id: 'files-sample-needs-from' })}
            </span>
          )}
        </div>
        <p className="text-label text-t5">
          {t({ id: 'files-presets' })}
        </p>
        {skippedLine}
      </div>
    );
  }
  const failed = new Map(failures.map((f) => [f.name, errorTitle(f.error, t)]));
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
      <div className="flex w-full items-center justify-between pt-0.5">
        <FilePicker onFiles={onFiles} fullWidth={false}>
          <span className={textAction()}>{t({ id: 'files-add-more' })}</span>
        </FilePicker>
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
