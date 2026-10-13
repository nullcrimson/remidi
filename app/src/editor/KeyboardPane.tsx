import type { Note } from '../core/midiremap';
import type { OctaveBase } from '../core/notes';
import { OctaveTabs } from './OctaveTabs';
import { PianoKeyboard } from './PianoKeyboard';

/** The octave tabs above the piano keyboard, both on the same octave. */
export function KeyboardPane({
  octIndex,
  currentNote,
  base,
  onSetOct,
  onPickNote,
}: {
  octIndex: number;
  currentNote: Note | null;
  base: OctaveBase;
  onSetOct: (octIndex: number) => void;
  onPickNote: (note: Note) => void;
}) {
  return (
    <>
      <OctaveTabs value={octIndex} base={base} onChange={onSetOct} />
      <PianoKeyboard octIndex={octIndex} currentNote={currentNote} base={base} onPickNote={onPickNote} />
    </>
  );
}
