import { useT } from '../locale/localeContext';
import type { Drum, Family, Note } from '../core/midiremap';
import { noteName, type OctaveBase } from '../core/notes';
import { DrumList } from './DrumList';
import { KeyboardPane } from './KeyboardPane';
import { PickerHeader } from './PickerHeader';
import { PickerShell } from './PickerShell';

export function NotePicker({
  voiceLabel,
  currentNote,
  octIndex,
  base,
  drums,
  families,
  onSetOct,
  onPickNote,
  onClose,
}: {
  voiceLabel: string;
  currentNote: Note | null;
  octIndex: number;
  base: OctaveBase;
  drums: Drum[];
  families: readonly Family[];
  onSetOct: (octIndex: number) => void;
  onPickNote: (note: Note) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <PickerShell label={t({ id: 'note-picker-label', args: { drum: voiceLabel } })} onClose={onClose}>
      <PickerHeader
        heading={t({ id: 'note-picker-heading', args: { drum: voiceLabel } })}
        className="mb-3"
        onClose={onClose}
      >
        <span className="font-mono text-brand font-bold text-accent">
          {currentNote === null ? '—' : noteName(currentNote, base)}
        </span>
      </PickerHeader>
      <div className="@container">
        <div
          data-testid="picker-layout"
          className="
            flex flex-col gap-4
            @2xl:flex-row
          "
        >
          <div className="min-w-0 flex-1">
            <DrumList drums={drums} families={families} currentNote={currentNote} base={base} onPickNote={onPickNote} />
          </div>
          <div className="
            flex w-full shrink-0 flex-col gap-3.25
            @2xl:w-96
          "
          >
            <KeyboardPane
              octIndex={octIndex}
              currentNote={currentNote}
              base={base}
              onSetOct={onSetOct}
              onPickNote={onPickNote}
            />
          </div>
        </div>
      </div>
    </PickerShell>
  );
}
