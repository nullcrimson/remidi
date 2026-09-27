import type { Drum } from '../lib/midiremap';
import { noteName, type OctaveBase } from '../lib/notes';
import { DrumList } from './DrumList';
import { IconButton } from './IconButton';
import { MonoLabel } from './MonoLabel';
import { OctaveTabs } from './OctaveTabs';
import { PianoKeyboard } from './PianoKeyboard';
import { PickerShell } from './PickerShell';

export function NotePicker({
  voiceLabel,
  currentNote,
  octIndex,
  base,
  drums,
  onSetOct,
  onPickSemitone,
  onPickNote,
  onClose,
}: {
  voiceLabel: string;
  currentNote: number | null;
  octIndex: number;
  base: OctaveBase;
  drums: Drum[];
  onSetOct: (octIndex: number) => void;
  onPickSemitone: (semitone: number) => void;
  onPickNote: (note: number) => void;
  onClose: () => void;
}) {
  return (
    <PickerShell label={`Target note for ${voiceLabel}`} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2.25">
          <MonoLabel tone="text-t4">TARGET · {voiceLabel}</MonoLabel>
          <span className="font-mono text-brand font-bold text-accent">
            {currentNote === null ? '—' : noteName(currentNote, base)}
          </span>
        </div>
        <IconButton label="Close" onClick={onClose}>×</IconButton>
      </div>
      <div className="@container">
        <div
          data-testid="picker-layout"
          className="
            flex flex-col gap-4
            @2xl:flex-row
          "
        >
          <div className="min-w-0 flex-1">
            <DrumList drums={drums} currentNote={currentNote} base={base} onPickNote={onPickNote} />
          </div>
          <div className="
            flex w-full shrink-0 flex-col gap-3.25
            @2xl:w-96
          "
          >
            <OctaveTabs value={octIndex} base={base} onChange={onSetOct} />
            <PianoKeyboard
              octIndex={octIndex}
              currentNote={currentNote}
              base={base}
              onPickSemitone={onPickSemitone}
            />
          </div>
        </div>
      </div>
    </PickerShell>
  );
}
