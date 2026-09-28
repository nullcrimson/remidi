import { useId, useState, type ReactNode } from 'react';
import type { VoiceRow as VoiceRowData } from '../lib/midiremap';
import { noteName, type OctaveBase } from '../lib/notes';
import { IconButton } from './IconButton';
import { OverlayAnchor } from './overlayAnchor';
import { chip, ROW_GRID } from './styles';
import { Tooltip } from './Tooltip';

export interface RowResult {
  text: string;
  tone: string;
}

function noteChip(active: boolean, changed: boolean): string {
  return chip(active ? 'on' : changed ? 'changed' : 'off', 'md');
}

function extrasHint(label: string, extras: string[], target: string | null): string {
  const one = extras.length === 1;
  const lead = `${extras.length} more source ${one ? 'note plays' : 'notes play'} ${label}: ${extras.join(', ')}.`;
  if (target === null) return `${lead} None has a target.`;
  return `${lead} ${one ? 'Both' : 'All'} go to ${target}.`;
}

export function VoiceRow({
  row,
  effectiveTgt,
  base,
  srcChanged,
  tgtChanged,
  srcExpanded,
  tgtExpanded,
  onSrcToggle,
  onToggle,
  result,
  onReset,
  children,
}: {
  row: VoiceRowData;
  effectiveTgt: number | null;
  base: OctaveBase;
  srcChanged: boolean;
  tgtChanged: boolean;
  srcExpanded: boolean;
  tgtExpanded: boolean;
  onSrcToggle: () => void;
  onToggle: () => void;
  result: RowResult;
  onReset?: () => void;
  children?: ReactNode;
}) {
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const playsId = useId();
  const dropped = row.status === 'dropped' || effectiveTgt === null;
  const [srcNote, ...extraNotes] = row.srcNotes;
  const silent = srcNote === undefined;
  const extraHint = extrasHint(
    row.label,
    extraNotes.map((n) => noteName(n, base)),
    dropped ? null : noteName(effectiveTgt, base),
  );
  return (
    <div
      ref={setRowEl}
      data-row
      className={`
        border-b border-white/4.5
        ${dropped || silent ? 'opacity-60' : ''}
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
            aria-expanded={srcExpanded}
            onClick={onSrcToggle}
            className={noteChip(srcExpanded, srcChanged)}
          >
            {silent ? '—' : noteName(srcNote, base)}
          </button>
        </span>
        <span aria-hidden="true" className="text-center text-decor">→</span>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={tgtExpanded}
          aria-describedby={playsId}
          onClick={onToggle}
          className={
            dropped && effectiveTgt === null
              ? `
                ${chip('off', 'md')}
                justify-self-end border-dashed
              `
              : `
                ${noteChip(tgtExpanded, tgtChanged)}
                justify-self-end
              `
          }
        >
          {effectiveTgt === null ? '—' : noteName(effectiveTgt, base)}
        </button>
        <span
          id={playsId}
          data-testid="result"
          title={result.text}
          className={`
            col-span-3 col-start-2 row-start-2 truncate text-right text-label
            sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:text-left
            ${result.tone}
          `}
        >
          {result.text}
        </span>
        {onReset
          ? (
              <IconButton label={`Reset ${row.label}`} size="sm" onClick={onReset}>↺</IconButton>
            )
          : <span />}
      </div>
      <OverlayAnchor value={rowEl}>{(srcExpanded || tgtExpanded) && children}</OverlayAnchor>
    </div>
  );
}
