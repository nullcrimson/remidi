import type { Translate } from '../locale/i18n';
import { useT } from '../locale/localeContext';
import { useId, useState, type ReactNode } from 'react';
import type { VoiceRow as VoiceRowData } from '../core/midiremap';
import { noteName, type OctaveBase } from '../core/notes';
import { leadNote, playedNote } from '../core/outcome';
import { IconButton } from '../ui/IconButton';
import type { Pick } from './editorState';
import { OverlayAnchor } from './overlayAnchor';
import { chip, labelText, type LabelTone } from '../ui/styles';
import { ROW_GRID } from './rowGrid';
import { Tooltip } from '../ui/Tooltip';
import { useTruncationTooltip } from '../ui/useTruncationTooltip';

/**
 * What a row's Plays cell shows. Text that needs explaining carries `why`: a `hint`, shown on
 * hover or focus, and `onGo`, which a click on the text runs to show where it comes from.
 */
export interface RowResult {
  text: string;
  tone: LabelTone;
  why?: { hint: string; onGo: () => void };
}

function noteChip(active: boolean, changed: boolean): string {
  return chip(active ? 'on' : changed ? 'changed' : 'off', 'md');
}

function extrasHint(label: string, extras: string[], target: string | null, t: Translate): string {
  const args = { count: extras.length, drum: label, notes: extras.join(', ') };
  return target === null
    ? t({ id: 'row-extras-dropped', args })
    : t({ id: 'row-extras', args: { ...args, target } });
}

export function VoiceRow({
  row,
  base,
  srcChanged,
  tgtChanged,
  expanded,
  onSrcToggle,
  onToggle,
  result,
  onReset,
  children,
}: {
  row: VoiceRowData;
  base: OctaveBase;
  srcChanged: boolean;
  tgtChanged: boolean;
  expanded: Pick['kind'] | null;
  onSrcToggle: () => void;
  onToggle: () => void;
  result: RowResult;
  onReset?: () => void;
  children?: ReactNode;
}) {
  const t = useT();
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const { show, hide, tooltip } = useTruncationTooltip();
  const playsId = useId();
  const tgt = playedNote(row.outcome);
  const srcNote = leadNote(row);
  const silent = srcNote === null;
  const extraNotes = row.srcNotes.slice(1);
  const extraHint = extrasHint(
    row.label,
    extraNotes.map((n) => noteName(n, base)),
    tgt === null ? null : noteName(tgt, base),
    t,
  );
  return (
    <div
      ref={setRowEl}
      data-row={row.canon}
      className={`
        border-b border-white/4.5
        data-flash:row-flash
        ${tgt === null || silent ? 'opacity-60' : ''}
      `}
    >
      <div className={`
        ${ROW_GRID}
        py-2
      `}
      >
        <span
          data-testid="drum-label"
          className="line-clamp-2 text-label text-t2"
        >{row.label}
        </span>
        <span className="flex items-center gap-1.5 justify-self-end">
          {extraNotes.length > 0 && (
            <Tooltip content={extraHint}>
              <span
                tabIndex={0}
                aria-label={extraHint}
                className="tap font-mono text-caption text-t5"
              >
                +{extraNotes.length}
              </span>
            </Tooltip>
          )}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={expanded === 'src'}
            onClick={onSrcToggle}
            className={noteChip(expanded === 'src', srcChanged)}
          >
            {silent ? '—' : noteName(srcNote, base)}
          </button>
        </span>
        <span aria-hidden="true" className="text-center text-decor">→</span>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={expanded === 'tgt'}
          aria-describedby={playsId}
          onClick={onToggle}
          className={
            tgt === null
              ? `
                ${chip('off', 'md')}
                justify-self-end border-dashed
              `
              : `
                ${noteChip(expanded === 'tgt', tgtChanged)}
                justify-self-end
              `
          }
        >
          {tgt === null ? '—' : noteName(tgt, base)}
        </button>
        <span
          id={playsId}
          data-testid="result"
          onMouseEnter={result.why === undefined ? (e) => show(e.currentTarget, result.text) : undefined}
          onMouseLeave={hide}
          className={`
            col-span-3 col-start-2 row-start-2 truncate text-right text-label
            sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:text-left
            ${labelText(result.tone)}
          `}
        >
          {result.why === undefined
            ? result.text
            : (
                <Tooltip content={result.why.hint}>
                  <button
                    type="button"
                    onClick={result.why.onGo}
                    className="
                      tap cursor-pointer border-b border-dotted border-current
                    "
                  >{result.text}
                  </button>
                </Tooltip>
              )}
        </span>
        {onReset
          ? (
              <IconButton label={t({ id: 'row-reset', args: { drum: row.label } })} size="sm" onClick={onReset}>↺</IconButton>
            )
          : <span />}
      </div>
      {tooltip}
      <OverlayAnchor value={rowEl}>{expanded !== null && children}</OverlayAnchor>
    </div>
  );
}
