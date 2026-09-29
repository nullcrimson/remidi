import { t } from '../i18n';
import { noteName, type OctaveBase } from '../lib/notes';
import { IconButton } from './IconButton';
import { MonoLabel } from './MonoLabel';
import { OctaveTabs } from './OctaveTabs';
import { PianoKeyboard } from './PianoKeyboard';
import { PickerShell } from './PickerShell';

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
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2.25">
            <MonoLabel tone="text-t4">{t({ id: 'source-picker-heading', args: { drum: voiceLabel } })}</MonoLabel>
            <span className="font-mono text-brand font-bold text-accent">
              {currentNote === null ? '—' : noteName(currentNote, base)}
            </span>
          </div>
          <IconButton label={t({ id: 'close' })} onClick={onClose}>×</IconButton>
        </div>
        <OctaveTabs value={octIndex} base={base} onChange={onSetOct} />
        <PianoKeyboard
          octIndex={octIndex}
          currentNote={currentNote}
          base={base}
          onPickSemitone={onPickSemitone}
        />
      </div>
    </PickerShell>
  );
}
