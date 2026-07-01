import type { ReactNode } from 'react';
import type { VoiceRow as VoiceRowData } from '../lib/midiremap';
import { noteName, type OctaveBase } from '../lib/notes';

export function VoiceRow({
  row,
  effectiveTgt,
  base,
  expanded,
  onToggle,
  children,
}: {
  row: VoiceRowData;
  effectiveTgt: number | null;
  base: OctaveBase;
  expanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const dropped = row.status === 'dropped' || effectiveTgt === null;
  const changed = !dropped && effectiveTgt !== row.srcNote;
  return (
    <div className={`
      border-b border-white/4.5
      ${dropped ? 'opacity-50' : ''}
    `}>
      <div className="
        grid grid-cols-[1fr_auto_16px_auto] items-center gap-3 py-2
      ">
        <span className="truncate text-[12.5px] text-t2">{row.label}</span>
        <span className="
          justify-self-end font-mono text-[12px] font-semibold text-t3
        ">
          {noteName(row.srcNote, base)}
        </span>
        <span className="text-center text-t6">→</span>
        {dropped ? (
          <span className="justify-self-end font-mono text-[12px] text-t5">—</span>
        ) : (
          <button
            type="button"
            data-notepick-trigger
            aria-haspopup="dialog"
            aria-expanded={expanded}
            onClick={onToggle}
            className={`
              justify-self-end rounded-md border px-2.25 py-0.75 font-mono
              text-[12px] font-semibold transition-colors
              ${
              expanded
                ? 'border-accent bg-accent/18 text-t1'
                : changed
                  ? 'border-accent/28 bg-accent/6 text-t1'
                  : 'border-field-border bg-field text-t3'
            }
            `}
          >
            {noteName(effectiveTgt, base)}
          </button>
        )}
      </div>
      {expanded && children}
    </div>
  );
}
