import { useRef, type ReactElement } from 'react';
import { listed } from '../locale/list';
import { useLocale, useT } from '../locale/localeContext';
import type { FailedFile } from './batch';
import { ACCEPT_EXTENSIONS, takeFiles, type LoadedFile, type OnFiles } from '../core/files';
import type { FocusRef } from '../ui/useFocusIntent';
import { FileChips } from './FileChips';
import { FilePicker } from './FilePicker';
import { PlayIcon } from './PlayIcon';
import { UploadIcon } from './UploadIcon';
import { TextButton } from '../ui/TextButton';

/** Where the file step's layers sit on a phone: both in one grid cell, so the empty card holds the step's height. */
const ONE_CELL = 'max-sm:col-start-1 max-sm:row-start-1';

/**
 * The empty file step: the drop card with its choose button and the sample groove, the
 * preset hint and `handoff`. `kept` once files are added: on a phone its frame stays with its content
 * hidden and out of reach, holding the step's height under the chips; from `sm:` up it is gone.
 */
function EmptyFiles({
  kept,
  onPick,
  onTrySample,
  pickerRef,
  skippedLine,
  handoff,
}: {
  handoff?: ReactElement;
  kept: boolean;
  onPick: () => void;
  onTrySample?: () => void;
  pickerRef?: FocusRef;
  skippedLine: ReactElement | false;
}) {
  const t = useT();
  const hidden = kept ? 'invisible' : '';
  return (
    <div
      inert={kept}
      className={`
        flex flex-col gap-2
        ${ONE_CELL}
        ${kept ? 'sm:hidden' : ''}
      `}
    >
      <div className="
        flex flex-col rounded-card border-[1.5px] border-dashed border-accent/25
        bg-inset transition-colors
        has-[button:first-child:focus-visible]:border-accent/60
        has-[button:first-child:hover]:border-accent/60
      "
      >
        <FilePicker ref={kept ? undefined : pickerRef} onPick={onPick}>
          <div className={`
            group flex flex-col items-center gap-3 px-5 pt-6 pb-4 text-center
            ${hidden}
          `}
          >
            <UploadIcon />
            <span className="
              flex flex-wrap items-center justify-center gap-x-3 gap-y-2
              text-body text-t2
            "
            >
              <span>{t({ id: 'files-drop' })}</span>
              <span className="
                inline-flex items-center justify-center rounded-full border
                border-accent/45 px-4 py-1.5 font-display text-ui font-semibold
                text-accent transition
                group-hover:border-accent group-hover:bg-accent/8
                pointer-coarse:min-h-11
              "
              >
                {t({ id: 'files-choose' })}
              </span>
            </span>
          </div>
        </FilePicker>
        <div className={`
          mx-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1
          border-t border-hairline py-3 text-ui text-t4
          ${hidden}
        `}
        >
          <span>{t({ id: 'files-sample-lead' })}</span>
          <TextButton
            onClick={() => onTrySample?.()}
            disabled={onTrySample === undefined}
            reason={t({ id: 'files-sample-needs-from' })}
          >
            <PlayIcon />
            <span>{t({ id: 'files-sample' })}</span>
          </TextButton>
        </div>
      </div>
      <p className={`
        text-label text-t5
        ${hidden}
      `}
      >
        {t({ id: 'files-presets' })}
      </p>
      {handoff && <div className={hidden}>{handoff}</div>}
      {!kept && skippedLine}
    </div>
  );
}

/**
 * How files come into the file step: the drop card while there are none, then the chips of
 * the files added, with one file input that stays on the page as long as the step does, so a
 * file chosen in it is never lost to a change of state. On a phone the chips lie inside the
 * empty card's kept frame, with `notice` under them, so adding a file moves nothing below the step.
 */
export function FileIntake({
  files,
  failures,
  waiting = new Set(),
  skipped = [],
  replaced = [],
  onFiles,
  onRemove,
  onClear,
  onTrySample,
  pickerRef,
  notice,
  handoff,
}: {
  notice?: ReactElement;
  handoff?: ReactElement;
  pickerRef?: FocusRef;
  onTrySample?: () => void;
  files: LoadedFile[];
  failures: FailedFile[];
  waiting?: ReadonlySet<string>;
  skipped?: string[];
  replaced?: string[];
  onFiles: OnFiles;
  onRemove: (name: string) => void;
  onClear: () => void;
}) {
  const { t, locale } = useLocale().translator;
  const input = useRef<HTMLInputElement>(null);
  const pick = () => input.current?.click();
  const skippedLine = (skipped.length > 0 || replaced.length > 0) && (
    <div role="status" className="flex w-full flex-col gap-1 text-label text-t4">
      {replaced.length > 0 && <p>{t({ id: 'files-replaced', args: { count: replaced.length, names: listed(locale, replaced) } })}</p>}
      {skipped.length > 0 && <p>{t({ id: 'files-skipped', args: { names: listed(locale, skipped) } })}</p>}
    </div>
  );
  const kept = files.length > 0;
  return (
    <div className="max-sm:grid">
      <EmptyFiles kept={kept} onPick={pick} onTrySample={onTrySample} pickerRef={pickerRef} skippedLine={skippedLine} handoff={handoff} />
      {kept && (
        <div className={`
          flex flex-col gap-3 self-start
          ${ONE_CELL}
          max-sm:p-3
        `}
        >
          <FileChips
            files={files}
            failures={failures}
            waiting={waiting}
            onPick={pick}
            onRemove={onRemove}
            onClear={onClear}
            skippedLine={skippedLine}
          />
          {notice}
        </div>
      )}
      <input
        ref={input}
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
    </div>
  );
}
