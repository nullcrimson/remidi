import { useT } from '../localeContext';
import { useId, useMemo, useState } from 'react';
import type { CanonInfo, Drum } from '../lib/midiremap';
import type { SrcEdits } from '../lib/overrides';
import { noteName, type OctaveBase } from '../lib/notes';
import { Button } from './Button';
import { CanonPicker } from './CanonPicker';
import { IconButton } from './IconButton';
import { OverlayAnchor } from './overlayAnchor';
import { TextField } from './TextField';

function SourceEditorRow({
  note,
  current,
  changed,
  label,
  options,
  families,
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
  families: readonly string[];
  base: OctaveBase;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSet: (note: number, canon: string) => void;
  onClear: (note: number) => void;
}) {
  const t = useT();
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setRowEl}>
      <div
        className="
          flex items-center justify-between gap-2 rounded-chip px-2.5 py-1.5
          hover:bg-white/2
          pointer-coarse:py-3
        "
      >
        <button
          type="button"
          onClick={onToggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left text-ui"
        >
          <span className="w-10 shrink-0 font-mono text-label text-t4">
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
            {current ? label : t({ id: changed ? 'source-unassigned' : 'source-unmapped' })}
          </span>
        </button>
        {changed && (
          <IconButton
            label={t({ id: 'source-clear', args: { note: noteName(note, base) } })}
            size="sm"
            tone="danger"
            onClick={() => onClear(note)}
          >
            ×
          </IconButton>
        )}
      </div>
      <OverlayAnchor value={rowEl}>
        {open && (
          <CanonPicker
            noteLabel={noteName(note, base)}
            current={current}
            options={options}
            families={families}
            onPick={(canon) => {
              onSet(note, canon);
              onClose();
            }}
            onClose={onClose}
          />
        )}
      </OverlayAnchor>
    </div>
  );
}

export function SourceEditor({
  notes,
  srcEdits,
  options,
  families,
  base,
  initialNote = null,
  onSet,
  onClear,
}: {
  notes: Drum[];
  srcEdits: SrcEdits;
  options: CanonInfo[];
  families: readonly string[];
  base: OctaveBase;
  initialNote?: number | null;
  onSet: (note: number, canon: string) => void;
  onClear: (note: number) => void;
}) {
  const t = useT();
  const [openNote, setOpenNote] = useState<number | null>(initialNote);
  const [extra, setExtra] = useState<number[]>(initialNote === null ? [] : [initialNote]);
  const [addValue, setAddValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

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
    if (addValue.trim() === '' || !Number.isInteger(n) || n < 0 || n > 127) {
      setInvalid(true);
      return;
    }
    setExtra((prev) => (prev.includes(n) ? prev : [...prev, n]));
    setAddValue('');
    setOpenNote(n);
  };

  return (
    <div className="flex flex-col gap-1">
      {rowNotes.map((note) => {
        const override = srcEdits[note];
        const current = override === undefined ? (baseCanon.get(note) ?? null) : override;
        return (
          <SourceEditorRow
            key={note}
            note={note}
            current={current}
            changed={override !== undefined}
            label={current ? labelOf(current) : ''}
            options={options}
            families={families}
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
        <TextField
          mono
          value={addValue}
          onChange={(e) => {
            setAddValue(e.target.value);
            setInvalid(false);
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addNote();
          }}
          inputMode="numeric"
          aria-label={t({ id: 'source-add-label' })}
          placeholder={t({ id: 'source-add-placeholder' })}
          className="w-32"
        />
        <Button variant="secondary" size="sm" onClick={addNote}>{t({ id: 'source-add' })}</Button>
      </div>
      {invalid && (
        <p id={errorId} className="text-caption text-danger">
          {t({ id: 'source-add-invalid' })}
        </p>
      )}
    </div>
  );
}
