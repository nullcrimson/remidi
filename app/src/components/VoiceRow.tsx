import { useRef, type ReactNode } from 'react';
import type { VoiceRow as VoiceRowData } from '../lib/midiremap';
import { useDismiss } from '../hooks/useDismiss';
import { noteName, type OctaveBase } from '../lib/notes';
import { chip } from './styles';
import { Tooltip } from './Tooltip';

function noteChip(active: boolean, changed: boolean): string {
  return chip(active ? 'on' : changed ? 'changed' : 'off', 'md');
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
  onDismiss,
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
  onDismiss: () => void;
  children?: ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  useDismiss(rowRef, onDismiss, srcExpanded || tgtExpanded);
  const dropped = row.status === 'dropped' || effectiveTgt === null;
  const [srcNote, ...extraNotes] = row.srcNotes;
  const silent = srcNote === undefined;
  const extraNames = extraNotes.map((n) => noteName(n, base)).join(', ');
  return (
    <div
      ref={rowRef}
      className={`
        border-b border-white/4.5
        ${dropped || silent ? 'opacity-60' : ''}
      `}
    >
      <div className="
        grid grid-cols-[1fr_auto_16px_auto] items-center gap-3 py-2
      "
      >
        <span className="truncate text-label text-t2">{row.label}</span>
        <span className="flex items-center gap-1.5 justify-self-end">
          {extraNotes.length > 0 && (
            <Tooltip content={`Also ${extraNames}`}>
              <span
                tabIndex={0}
                aria-label={`Also plays ${extraNames}`}
                className="font-mono text-caption text-t5"
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
      </div>
      {(srcExpanded || tgtExpanded) && children}
    </div>
  );
}
