import { useT } from '../locale/localeContext';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { assignedNotes, firstListed, type Assigning } from './assigning';
import type { Canon, Drum, Family, Note, CanonEntry } from '../core/midiremap';
import type { SrcEdits } from '../core/overrides';
import { canonLabels } from '../core/canon';
import { ascending, byNote, noteName, parseNote, type OctaveBase } from '../core/notes';
import { Button } from '../ui/Button';
import { CanonPicker } from './CanonPicker';
import { IconButton } from '../ui/IconButton';
import { OverlayAnchor } from './overlayAnchor';
import { TextField } from '../ui/TextField';
import { centerAndFocus } from '../ui/reveal';

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
  note: Note;
  current: Canon | null;
  changed: boolean;
  label: string;
  options: CanonEntry[];
  families: readonly Family[];
  base: OctaveBase;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSet: (note: Note, canon: Canon) => void;
  onClear: (note: Note) => void;
}) {
  const t = useT();
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setRowEl} data-source-note={note}>
      <div
        className="
          flex items-center justify-between gap-2 rounded-chip pr-2.5
          hover:bg-white/2
        "
      >
        <button
          type="button"
          onClick={onToggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="
            flex min-w-0 flex-1 items-center gap-3 py-1.5 pl-2.5 text-left
            text-ui
            pointer-coarse:min-h-11 pointer-coarse:py-3
          "
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

/**
 * Advanced: the source's notes and those `assigning` names, each with the drum it reads as
 * and a picker to change it, and a field to add another note. Opened on a list of notes, the
 * first of them is scrolled to the middle of the window and focused. Clearing a note's edit
 * leaves focus on its row, or on the field when the row goes with the edit.
 */
export function SourceEditor({
  notes,
  srcEdits,
  options,
  families,
  base,
  assigning = null,
  onSet,
  onClear,
}: {
  notes: Drum[];
  srcEdits: SrcEdits;
  options: CanonEntry[];
  families: readonly Family[];
  base: OctaveBase;
  assigning?: Assigning | null;
  onSet: (note: Note, canon: Canon) => void;
  onClear: (note: Note) => void;
}) {
  const t = useT();
  const [openNote, setOpenNote] = useState<Note | null>(assigning?.kind === 'note' ? assigning.note : null);
  const [extra, setExtra] = useState<Note[]>(() => assignedNotes(assigning));
  const [first] = useState(() => firstListed(assigning));
  const listRef = useRef<HTMLDivElement>(null);
  const noteButton = (note: Note) => listRef.current?.querySelector<HTMLElement>(`[data-source-note="${note}"] button`) ?? null;
  useEffect(() => {
    const row = first === null ? null : noteButton(first);
    if (row !== null) centerAndFocus(row, row);
  }, [first]);
  const clear = (note: Note) => {
    flushSync(() => onClear(note));
    (noteButton(note) ?? listRef.current?.querySelector<HTMLElement>('input') ?? null)?.focus();
  };
  const [addValue, setAddValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

  const labelOf = useMemo(() => canonLabels(options), [options]);

  const baseCanon = useMemo(
    () => new Map(notes.map((n) => [n.note, n.canon])),
    [notes],
  );

  const rowNotes = useMemo(() => {
    const set = new Set<Note>();
    for (const n of notes) set.add(n.note);
    for (const e of extra) set.add(e);
    for (const [note] of byNote(srcEdits)) set.add(note);
    return [...set].sort(ascending);
  }, [notes, extra, srcEdits]);

  const addNote = () => {
    const n = addValue.trim() === '' ? null : parseNote(Number(addValue));
    if (n === null) {
      setInvalid(true);
      return;
    }
    setExtra((prev) => (prev.includes(n) ? prev : [...prev, n]));
    setAddValue('');
    setOpenNote(n);
  };

  return (
    <div ref={listRef} className="flex flex-col gap-1">
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
            onClear={clear}
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
