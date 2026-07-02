import { useRef, type ReactNode } from 'react';
import type { VoiceRow as VoiceRowData } from '../lib/midiremap';
import { useDismiss } from '../hooks/useDismiss';
import { noteName, type OctaveBase } from '../lib/notes';

const CHIP = `
  justify-self-end rounded-md border px-2.25 py-0.75 font-mono text-[12px]
  font-semibold transition
  hover:shadow-[0_0_12px_-2px_rgba(199,192,173,0.45)]
`;

function chipState(active: boolean, changed: boolean): string {
  if (active) return 'border-accent bg-accent/18 text-t1';
  if (changed) return 'border-accent/28 bg-accent/6 text-t1 hover:border-accent';
  return 'border-field-border bg-field text-t3 hover:border-accent/40 hover:text-t1';
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
  return (
    <div
      ref={rowRef}
      className={`
        border-b border-white/4.5
        ${dropped ? 'opacity-60' : ''}
      `}
    >
      <div className="
        grid grid-cols-[1fr_auto_16px_auto] items-center gap-3 py-2
      "
      >
        <span className="truncate text-[12.5px] text-t2">{row.label}</span>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={srcExpanded}
          onClick={onSrcToggle}
          className={`
            ${CHIP}
            ${chipState(srcExpanded, srcChanged)}
          `}
        >
          {noteName(row.srcNote, base)}
        </button>
        <span className="text-center text-t6">→</span>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={tgtExpanded}
          onClick={onToggle}
          className={
            dropped && effectiveTgt === null
              ? `
                ${CHIP}
                border-dashed border-field-border bg-transparent text-t5
                hover:border-accent/40 hover:text-t2
              `
              : `
                ${CHIP}
                ${chipState(tgtExpanded, tgtChanged)}
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
