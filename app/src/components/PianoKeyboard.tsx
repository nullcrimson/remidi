import { noteInOctave, noteName, type OctaveBase } from '../lib/notes';

const WHITE = [
  { s: 0, l: 'C' },
  { s: 2, l: 'D' },
  { s: 4, l: 'E' },
  { s: 5, l: 'F' },
  { s: 7, l: 'G' },
  { s: 9, l: 'A' },
  { s: 11, l: 'B' },
];
const BLACK = [
  { s: 1, left: 10.0 },
  { s: 3, left: 24.3 },
  { s: 6, left: 52.8 },
  { s: 8, left: 67.1 },
  { s: 10, left: 81.4 },
];

export function PianoKeyboard({
  octIndex,
  currentNote,
  base,
  onPickSemitone,
}: {
  octIndex: number;
  currentNote: number | null;
  base: OctaveBase;
  onPickSemitone: (semitone: number) => void;
}) {
  return (
    <div className="relative flex w-full">
      {WHITE.map((w) => {
        const note = noteInOctave(octIndex, w.s);
        const active = note === currentNote;
        return (
          <button
            key={w.s}
            type="button"
            aria-label={noteName(note, base)}
            aria-pressed={active}
            onClick={() => onPickSemitone(w.s)}
            className={`
              flex h-21.5 flex-1 items-end justify-center rounded-b-chip border
              border-t-0 border-keyborder pb-1.75 font-mono text-label text-ink
              transition
              ${
          active
            ? `bg-accent shadow-key-pressed`
            : `
              bg-keywhite
              hover:shadow-key-glow
            `
          }
            `}
          >
            {w.l}
          </button>
        );
      })}
      {BLACK.map((b) => {
        const note = noteInOctave(octIndex, b.s);
        const active = note === currentNote;
        return (
          <button
            key={b.s}
            type="button"
            data-testid={`black-${b.s}`}
            aria-label={noteName(note, base)}
            aria-pressed={active}
            onClick={() => onPickSemitone(b.s)}
            style={{ left: `${b.left}%` }}
            className={`
              absolute top-0 z-10 h-13.5 w-[8.6%] rounded-b-chip border
              border-black transition
              ${
          active
            ? 'bg-keyactive shadow-key-lit'
            : `
              bg-keyblack shadow-key-black
              hover:shadow-key-glow-dim
            `
          }
            `}
          />
        );
      })}
    </div>
  );
}
