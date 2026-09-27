import { useRef } from 'react';
import { useRestoreFocus } from '../hooks/useRestoreFocus';
import { noteName, type OctaveBase } from '../lib/notes';
import { IconButton } from './IconButton';
import { MonoLabel } from './MonoLabel';
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
  currentNote: number | null;
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
        my-0.5 mb-3 w-full rounded-panel border border-accent/18 bg-inset
        p-[13px_14px_16px] outline-none
        sm:ml-auto sm:w-max
      "
    >
      <div className="
        flex w-full flex-col gap-3.25
        sm:w-96
      "
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2.25">
            <MonoLabel tone="text-t4">INCOMING · {voiceLabel}</MonoLabel>
            <span className="font-mono text-brand font-bold text-accent">
              {currentNote === null ? '—' : noteName(currentNote, base)}
            </span>
          </div>
          <IconButton label="Close" onClick={onClose}>×</IconButton>
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
