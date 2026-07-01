import { noteName, octaveTabLabel, type OctaveBase } from '../lib/notes';
import { PianoKeyboard } from './PianoKeyboard';

const OCT_INDICES = [-1, 0, 1, 2, 3, 4, 5, 6, 7];

export function NotePicker({
  voiceLabel,
  currentNote,
  octIndex,
  base,
  onSetOct,
  onPick,
  onClose,
}: {
  voiceLabel: string;
  currentNote: number;
  octIndex: number;
  base: OctaveBase;
  onSetOct: (octIndex: number) => void;
  onPick: (semitone: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="
      my-0.5 mb-3 rounded-[10px] border border-accent/18 bg-white/[0.018]
      p-[13px_14px_16px]
    ">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2.25">
          <span className="font-mono text-[9.5px] tracking-[0.12em] text-t4">
            TARGET · {voiceLabel}
          </span>
          <span className="font-mono text-[15px] font-bold text-accent">
            {noteName(currentNote, base)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="
            flex size-5 items-center justify-center rounded-[5px] bg-white/5
            text-[14px] text-t4
          "
        >
          ×
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 pb-3.25">
        {OCT_INDICES.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onSetOct(o)}
            className={`
              rounded-md border px-2.75 py-1.25 font-mono text-[11px]
              font-semibold
              ${
              o === octIndex ? 'border-accent bg-accent/15 text-t1' : `
                border-white/8 text-t4
              `
            }
            `}
          >
            {octaveTabLabel(o, base)}
          </button>
        ))}
      </div>
      <PianoKeyboard octIndex={octIndex} currentNote={currentNote} onPick={onPick} />
    </div>
  );
}
