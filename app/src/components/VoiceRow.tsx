import type { VoiceRow as VoiceRowData } from '../lib/midiremap';
import { noteName, type OctaveBase } from '../lib/notes';
import { NotePicker } from './NotePicker';

export function VoiceRow({
  row,
  effectiveTgt,
  base,
  expanded,
  pickOctIndex,
  onOpen,
  onSetOct,
  onPick,
  onClose,
}: {
  row: VoiceRowData;
  effectiveTgt: number | null;
  base: OctaveBase;
  expanded: boolean;
  pickOctIndex: number;
  onOpen: () => void;
  onSetOct: (octIndex: number) => void;
  onPick: (semitone: number) => void;
  onClose: () => void;
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
        <span className="justify-self-end font-mono text-[12px] text-t3">
          {noteName(row.srcNote, base)}
        </span>
        <span className="text-center text-t6">→</span>
        {dropped ? (
          <span className="justify-self-end font-mono text-[12px] text-t5">—</span>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className={`
              justify-self-end rounded-md border px-2.25 py-0.75 font-mono
              text-[12px] transition-colors
              ${
              expanded
                ? 'border-accent bg-accent/18 text-t1'
                : changed
                  ? 'border-accent/28 bg-accent/6 text-t1'
                  : 'border-white/8 bg-white/2.5 text-t3'
            }
            `}
          >
            {noteName(effectiveTgt, base)}
          </button>
        )}
      </div>
      {expanded && effectiveTgt !== null && (
        <NotePicker
          voiceLabel={row.label}
          currentNote={effectiveTgt}
          octIndex={pickOctIndex}
          base={base}
          onSetOct={onSetOct}
          onPick={onPick}
          onClose={onClose}
        />
      )}
    </div>
  );
}
