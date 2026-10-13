import { useT } from '../locale/localeContext';
import type { Note } from '../core/midiremap';
import { noteName, type OctaveBase } from '../core/notes';
import { KeyboardPane } from './KeyboardPane';
import { PickerHeader } from './PickerHeader';
import { PickerShell } from './PickerShell';

export function SourceNotePicker({
  voiceLabel,
  currentNote,
  octIndex,
  base,
  onSetOct,
  onPickNote,
  onClose,
}: {
  voiceLabel: string;
  currentNote: Note | null;
  octIndex: number;
  base: OctaveBase;
  onSetOct: (octIndex: number) => void;
  onPickNote: (note: Note) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <PickerShell
      label={t({ id: 'source-picker-label', args: { drum: voiceLabel } })}
      onClose={onClose}
      className="sm:ml-auto sm:w-max"
    >
      <div className="
        flex w-full flex-col gap-3.25
        sm:w-96
      "
      >
        <PickerHeader
          heading={t({ id: 'source-picker-heading', args: { drum: voiceLabel } })}
          onClose={onClose}
        >
          <span className="font-mono text-brand font-bold text-accent">
            {currentNote === null ? '—' : noteName(currentNote, base)}
          </span>
        </PickerHeader>
        <KeyboardPane
          octIndex={octIndex}
          currentNote={currentNote}
          base={base}
          onSetOct={onSetOct}
          onPickNote={onPickNote}
        />
      </div>
    </PickerShell>
  );
}
