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
  currentNote: number;
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
              flex h-21.5 flex-1 items-end justify-center rounded-b-[5px] border
              border-t-0 border-keyborder pb-1.75 font-mono text-[10px] text-ink
              transition
              ${
          active
            ? `
              bg-accent
              shadow-[0_0_10px_rgba(199,192,173,0.45),inset_0_0_0_2px_var(--color-keyinset)]
            `
            : `
              bg-keywhite
              hover:shadow-[0_0_14px_rgba(236,232,224,0.6)]
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
              absolute top-0 z-10 h-13.5 w-[8.6%] rounded-b-sm border
              border-black transition
              ${
          active
            ? 'bg-keyactive shadow-[0_0_10px_rgba(199,192,173,0.45)]'
            : `
              bg-keyblack shadow-[0_2px_3px_rgba(0,0,0,0.5)]
              hover:shadow-[0_0_14px_rgba(236,232,224,0.55)]
            `
          }
            `}
          />
        );
      })}
    </div>
  );
}
