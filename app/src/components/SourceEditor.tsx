import { useMemo, useRef, useState } from 'react';
import type { CanonInfo, Drum } from '../lib/midiremap';
import type { SrcEdits } from '../lib/overrides';
import { useDismiss } from '../hooks/useDismiss';
import { noteName, type OctaveBase } from '../lib/notes';
import { CanonPicker } from './CanonPicker';

function SourceEditorRow({
  note,
  current,
  changed,
  label,
  options,
  base,
  open,
  onToggle,
  onClose,
  onSet,
  onClear,
}: {
  note: number;
  current: string | null;
  changed: boolean;
  label: string;
  options: CanonInfo[];
  base: OctaveBase;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSet: (note: number, canon: string) => void;
  onClear: (note: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  useDismiss(rowRef, onClose, open);
  return (
    <div ref={rowRef}>
      <div
        className="
          flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5
          hover:bg-white/2
        "
      >
        <button
          type="button"
          onClick={onToggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="
            flex min-w-0 flex-1 items-center gap-3 text-left text-[12px]
          "
        >
          <span className="w-10 shrink-0 font-mono text-[11px] text-t4">
            {noteName(note, base)}
          </span>
          <span
            className={
              changed
                ? 'truncate text-accent'
                : current
                  ? `truncate text-t2`
                  : `truncate text-danger`
            }
          >
            {current ? label : 'unmapped'}
          </span>
        </button>
        {changed && (
          <button
            type="button"
            aria-label={`Clear source note ${noteName(note, base)}`}
            onClick={() => onClear(note)}
            className="
              shrink-0 rounded-[5px] px-1.5 text-[13px] text-t5
              hover:text-danger
            "
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <CanonPicker
          noteLabel={noteName(note, base)}
          current={current}
          options={options}
          onPick={(canon) => {
            onSet(note, canon);
            onClose();
          }}
          onClose={onClose}
        />
      )}
    </div>
  );
}

export function SourceEditor({
  notes,
  srcEdits,
  options,
  base,
  onSet,
  onClear,
}: {
  notes: Drum[];
  srcEdits: SrcEdits;
  options: CanonInfo[];
  base: OctaveBase;
  onSet: (note: number, canon: string) => void;
  onClear: (note: number) => void;
}) {
  const [openNote, setOpenNote] = useState<number | null>(null);
  const [extra, setExtra] = useState<number[]>([]);
  const [addValue, setAddValue] = useState('');

  const labelOf = useMemo(() => {
    const m = new Map(options.map((o) => [o.canon, o.label]));
    return (canon: string) => m.get(canon) ?? canon;
  }, [options]);

  const baseCanon = useMemo(
    () => new Map(notes.map((n) => [n.note, n.canon])),
    [notes],
  );

  const rowNotes = useMemo(() => {
    const set = new Set<number>();
    for (const n of notes) set.add(n.note);
    for (const e of extra) set.add(e);
    for (const k of Object.keys(srcEdits)) set.add(Number(k));
    return [...set].sort((a, b) => a - b);
  }, [notes, extra, srcEdits]);

  const addNote = () => {
    const n = Number(addValue);
    if (!Number.isInteger(n) || n < 0 || n > 127) return;
    setExtra((prev) => (prev.includes(n) ? prev : [...prev, n]));
    setAddValue('');
    setOpenNote(n);
  };

  return (
    <div className="flex flex-col gap-1">
      {rowNotes.map((note) => {
        const override = srcEdits[note];
        const current = override ?? baseCanon.get(note) ?? null;
        return (
          <SourceEditorRow
            key={note}
            note={note}
            current={current}
            changed={override !== undefined}
            label={current ? labelOf(current) : ''}
            options={options}
            base={base}
            open={openNote === note}
            onToggle={() => setOpenNote(openNote === note ? null : note)}
            onClose={() => setOpenNote(null)}
            onSet={onSet}
            onClear={onClear}
          />
        );
      })}

      <div className="mt-2 flex items-center gap-2">
        <input
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addNote();
          }}
          inputMode="numeric"
          aria-label="Add source note"
          placeholder="add note 0–127"
          className="
            w-32 rounded-md border border-field-border bg-field px-2 py-1.25
            font-mono text-[11px] text-t2 transition-colors outline-none
            placeholder:text-t5
            focus:border-accent/40
          "
        />
        <button
          type="button"
          onClick={addNote}
          className="
            rounded-md border border-field-border px-2.5 py-1.25 text-[11px]
            text-t3 transition-colors
            hover:text-t1
          "
        >
          add
        </button>
      </div>
    </div>
  );
}
