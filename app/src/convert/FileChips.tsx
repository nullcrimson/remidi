import { useT } from '../locale/localeContext';
import type { FailedFile } from './batch';
import type { LoadedFile, OnFiles } from '../core/files';
import { track } from '../core/stats';
import { errorTitle } from '../ui/errorTitle';
import type { FocusRef } from '../ui/useFocusIntent';
import { FilePicker } from './FilePicker';
import { IconButton } from '../ui/IconButton';
import { MidBadge } from './MidBadge';
import { PlayIcon } from './PlayIcon';
import { UploadIcon } from './UploadIcon';
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
  const skippedLine = skipped.length > 0 && (
    <p role="status" className="w-full text-label text-t4">
      {t({ id: 'files-skipped', args: { names: skipped.join(', ') } })}
    </p>
  );
  if (files.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="
          flex flex-col rounded-card border-[1.5px] border-dashed
          border-accent/25 bg-inset transition-colors
          has-[button:first-child:focus-visible]:border-accent/60
          has-[button:first-child:hover]:border-accent/60
        "
        >
          <FilePicker ref={pickerRef} onFiles={onFiles}>
            <div className="
              group flex flex-col items-center gap-3 px-5 pt-6 pb-4 text-center
            "
            >
              <UploadIcon />
              <span className="
                flex flex-wrap items-center justify-center gap-x-3 gap-y-2
                text-body text-t2
              "
              >
                {t({ id: 'files-drop' })}
                <span className="
                  inline-flex items-center justify-center rounded-full border
                  border-accent/45 px-4 py-1.5 font-display text-ui
                  font-semibold text-accent transition
                  group-hover:border-accent group-hover:bg-accent/8
                  pointer-coarse:min-h-11
                "
                >
                  {t({ id: 'files-choose' })}
                </span>
              </span>
            </div>
          </FilePicker>
          <div className="
            mx-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1
            border-t border-hairline py-3 text-ui text-t4
          "
          >
            <span>{t({ id: 'files-sample-lead' })}</span>
            <TextButton
              onClick={() => onTrySample?.()}
              disabled={onTrySample === undefined}
              reason={t({ id: 'files-sample-needs-from' })}
            >
              <PlayIcon />
              {t({ id: 'files-sample' })}
            </TextButton>
          </div>
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
    <div className="flex flex-wrap items-center gap-2">
      {files.map((f) => {
        const error = failed.get(f.name);
        const bad = error !== undefined;
        return (
          <div
            key={f.name}
            data-state={bad ? 'failed' : 'ok'}
            title={error}
            className={`
              flex max-w-full items-center gap-1.5 rounded-full border py-1
              pr-1.5 pl-3
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
      <FilePicker onFiles={onFiles} fullWidth={false}>
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
