import { noteInOctave } from "../lib/notes";

const WHITE = [
  { s: 0, l: "C" },
  { s: 2, l: "D" },
  { s: 4, l: "E" },
  { s: 5, l: "F" },
  { s: 7, l: "G" },
  { s: 9, l: "A" },
  { s: 11, l: "B" },
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
  onPick,
}: {
  octIndex: number;
  currentNote: number;
  onPick: (semitone: number) => void;
}) {
  return (
    <div className="relative flex">
      {WHITE.map((w) => {
        const active = noteInOctave(octIndex, w.s) === currentNote;
        return (
          <button
            key={w.s}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(w.s)}
            className={`
              flex h-21.5 flex-1 items-end justify-center rounded-b-[5px] border
              border-t-0 border-keyborder pb-1.75 font-mono text-[10px] text-ink
              ${
              active
                ? "bg-accent shadow-[inset_0_0_0_2px_#8c8473]"
                : "bg-keywhite"
            }
            `}
          >
            {w.l}
          </button>
        );
      })}
      {BLACK.map((b) => {
        const active = noteInOctave(octIndex, b.s) === currentNote;
        return (
          <button
            key={b.s}
            type="button"
            data-testid={`black-${b.s}`}
            aria-label={`black ${b.s}`}
            aria-pressed={active}
            onClick={() => onPick(b.s)}
            style={{ left: `${b.left}%` }}
            className={`
              absolute top-0 z-10 h-13.5 w-[8.6%] rounded-b-sm border
              border-black
              ${
              active
                ? "bg-accent shadow-[0_0_9px_rgba(199,192,173,.7)]"
                : "bg-keyblack"
            }
            `}
          />
        );
      })}
    </div>
  );
}
