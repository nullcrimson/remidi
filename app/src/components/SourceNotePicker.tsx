import { useRef } from 'react';
import { useRestoreFocus } from '../hooks/useRestoreFocus';
import { noteName, type OctaveBase } from '../lib/notes';
import { OctaveTabs } from './OctaveTabs';
import { PianoKeyboard } from './PianoKeyboard';

export function SourceNotePicker({
  voiceLabel,
  currentNote,
  octIndex,
  base,
  onSetOct,
  onPickSemitone,
  onClose,
}: {
  voiceLabel: string;
  currentNote: number;
  octIndex: number;
  base: OctaveBase;
  onSetOct: (octIndex: number) => void;
  onPickSemitone: (semitone: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useRestoreFocus(ref);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Source note for ${voiceLabel}`}
      tabIndex={-1}
      className="
        my-0.5 mb-3 ml-auto w-max rounded-[10px] border border-accent/18
        bg-inset p-[13px_14px_16px] outline-none
      "
    >
      <div className="flex w-96 flex-col gap-3.25">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2.25">
            <span className="font-mono text-[9.5px] tracking-[0.12em] text-t4">
              INCOMING · {voiceLabel}
            </span>
            <span className="font-mono text-[15px] font-bold text-accent">
              {noteName(currentNote, base)}
            </span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="
              flex size-5 items-center justify-center rounded-[5px] bg-white/5
              text-[14px] text-t4
            "
          >
            ×
          </button>
        </div>
        <OctaveTabs value={octIndex} base={base} onChange={onSetOct} />
        <PianoKeyboard
          octIndex={octIndex}
          currentNote={currentNote}
          base={base}
          onPickSemitone={onPickSemitone}
        />
      </div>
    </div>
  );
}
