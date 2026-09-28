import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { noteName, type OctaveBase } from '../lib/notes';
import type { Editor } from '../hooks/useEditor';
import { useFilter } from '../hooks/useFilter';
import { FAMILY_ORDER } from '../lib/families';
import type { VoiceRow as VoiceRowData } from '../lib/midiremap';
import { MAPPINGS_CAP, type SavedMapping } from '../lib/mappings';
import { shortCode } from '../lib/format';
import { Button } from './Button';
import { ChipRadioGroup } from './ChipRadioGroup';
import { FilterInput } from './FilterInput';
import { IconButton } from './IconButton';
import { MonoLabel } from './MonoLabel';
import { NotePicker } from './NotePicker';
import { PlanErrorNotice } from './PlanErrorNotice';
import { SourceEditor } from './SourceEditor';
import { SourceNotePicker } from './SourceNotePicker';
import { ROW_GRID, textAction } from './styles';
import { TextButton } from './TextButton';
import { TextField } from './TextField';
import { Tooltip, TooltipBody } from './Tooltip';
import { VoiceRow, type RowResult } from './VoiceRow';

export interface EditViewProps {
  editor: Editor;
  src: string;
  tgt: string;
  srcName: string;
  tgtName: string;
  oct: OctaveBase;
  existingPreset: SavedMapping | undefined;
  presetsAtCap: boolean;
  assignNote?: number | null;
  initialShow?: EditFilter;
  setView: (v: 'convert' | 'edit') => void;
  onSavePreset: (name: string) => void;
  onUpdatePreset: (id: string, name: string) => void;
}

function SavePreset({
  src,
  tgt,
  existingPreset,
  atCap,
  onSave,
  onUpdate,
}: {
  src: string;
  tgt: string;
  existingPreset: SavedMapping | undefined;
  atCap: boolean;
  onSave: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const pairLabel = `${shortCode(src)}→${shortCode(tgt)}`;

  const open = () => {
    setName(existingPreset?.name ?? pairLabel);
    setNaming(true);
  };
  const trimmed = name.trim();
  const saveNew = () => {
    if (!trimmed || atCap) return;
    onSave(trimmed);
    setNaming(false);
  };
  const saveUpdate = () => {
    if (!trimmed || !existingPreset) return;
    onUpdate(existingPreset.id, trimmed);
    setNaming(false);
  };
  const primary = () => (existingPreset ? saveUpdate() : saveNew());

  if (!naming) {
    return (
      <Tooltip
        content={(
          <TooltipBody title="Reuse this mapping">
            Saves the FROM→TO pair and any note changes as a chip on the main
            screen — one click reloads it. Kept in this browser only.
          </TooltipBody>
        )}
      >
        <span className="inline-flex">
          <Button variant="secondary" size="sm" onClick={open}>
            {existingPreset ? 'Update preset' : 'Save as preset'}
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <div
      className="
        flex basis-full flex-col gap-2 rounded-panel border border-hairline
        bg-inset p-3
      "
    >
      <div className="flex items-center gap-2">
        <TextField
          value={name}
          autoFocus
          aria-label="Preset name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') primary();
            if (e.key === 'Escape') setNaming(false);
          }}
          className="min-w-0 flex-1"
        />
        {existingPreset
          ? (
              <>
                <Button variant="primary" size="sm" onClick={saveUpdate} disabled={!trimmed}>
                  Update
                </Button>
                <Button variant="secondary" size="sm" onClick={saveNew} disabled={!trimmed || atCap}>
                  Save new
                </Button>
              </>
            )
          : (
              <Button variant="primary" size="sm" onClick={saveNew} disabled={!trimmed || atCap}>
                Save
              </Button>
            )}
        <IconButton label="Cancel" onClick={() => setNaming(false)}>×</IconButton>
      </div>
      {existingPreset && (
        <p className="text-label text-t5">
          A preset for {pairLabel} already exists.
        </p>
      )}
      {atCap && !existingPreset && (
        <p className="text-label text-danger">
          Preset limit reached ({MAPPINGS_CAP}).
        </p>
      )}
    </div>
  );
}

/** Which rows the editor lists. */
export type EditFilter = 'all' | 'changed' | 'issues';

const isIssue = (row: VoiceRowData) => row.srcNotes.length > 0 && row.status !== 'direct';

function playsOf(row: VoiceRowData, changed: boolean, drumAt: (note: number) => string): RowResult {
  if (row.srcNotes.length === 0) return { text: 'no source', tone: 'text-t5' };
  if (row.tgtNote === null) return { text: 'dropped', tone: 'text-danger' };
  const name = drumAt(row.tgtNote);
  if (changed) return { text: name, tone: 'text-t2' };
  if (row.status === 'fallback') return { text: `≈ ${name}`, tone: 'text-star' };
  return { text: name, tone: 'text-t5' };
}

function byFamily(rows: VoiceRowData[], familyOf: Map<string, string>) {
  const families = new Map<string, VoiceRowData[]>();
  for (const row of rows) {
    const family = familyOf.get(row.canon) ?? 'Other';
    families.set(family, [...(families.get(family) ?? []), row]);
  }
  const rank = (f: string) => {
    const i = FAMILY_ORDER.indexOf(f);
    return i === -1 ? FAMILY_ORDER.length : i;
  };
  return [...families.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([family, items]) => ({ family, items }));
}

export function EditView({
  editor,
  src,
  tgt,
  srcName,
  tgtName,
  oct,
  existingPreset,
  presetsAtCap,
  assignNote = null,
  initialShow = 'all',
  setView,
  onSavePreset,
  onUpdatePreset,
}: EditViewProps) {
  const {
    rows,
    planError,
    edits,
    srcEdits,
    pick,
    notice,
    targetDrums,
    sourceNotes,
    canonOptions,
    changed,
    changedSrc,
    resetRow,
    reset,
    openPick,
    openSrcPick,
    setPickOct,
    chooseNote,
    chooseNoteAbsolute,
    chooseSrcNote,
    closePick,
    setSrcCanon,
    clearSrcCanon,
  } = editor;
  const [advanced, setAdvanced] = useState(assignNote !== null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [focusHeading] = useState(pick === null && assignNote === null);
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);
  const [show, setShow] = useState<EditFilter>(initialShow);
  const showId = useId();
  const { q, setQ, filtered } = useFilter(rows, (r) => r.label);
  const issues = rows.filter(isIssue);
  const shown = filtered.filter((r) =>
    show === 'changed' ? changed.has(r.canon) : show === 'issues' ? isIssue(r) : true,
  );
  const familyOf = new Map(canonOptions.map((c) => [c.canon, c.family]));
  const drumByNote = new Map<number, string>();
  for (const d of targetDrums) if (!drumByNote.has(d.note)) drumByNote.set(d.note, d.label);
  const drumAt = (note: number) => drumByNote.get(note) ?? noteName(note, oct);
  const groups = byFamily(shown, familyOf);
  const changes = changed.size;

  return (
    <div className="flex flex-col">
      <div className="
        flex flex-col gap-5 p-5
        sm:p-[26px_30px_24px]
      "
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <TextButton onClick={() => setView('convert')}>← Back</TextButton>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-body font-semibold text-t1 outline-none"
            >
              Edit notes
            </h2>
          </div>
          <span className="truncate text-label text-t4">
            {srcName} → {tgtName}
          </span>
        </div>

        {planError !== null && <PlanErrorNotice message={planError} onReset={reset} />}

        <div className="
          flex flex-col gap-2
          sm:flex-row sm:items-start sm:gap-4
        "
        >
          <div className="sm:w-64">
            <FilterInput value={q} onChange={setQ} ariaLabel="Filter drums" placeholder="filter drums…" />
          </div>
          <span id={showId} className="sr-only">Show</span>
          <ChipRadioGroup
            labelledBy={showId}
            options={[
              { value: 'all', label: `All ${rows.length}` },
              { value: 'changed', label: `Changed ${changes}` },
              { value: 'issues', label: `Issues ${issues.length}` },
            ]}
            value={show}
            onChange={setShow}
          />
        </div>

        <div>
          <div className={`
            ${ROW_GRID}
            pb-1
          `}
          >
            <MonoLabel>DRUM</MonoLabel>
            <MonoLabel className="justify-self-end">SOURCE</MonoLabel>
            <span />
            <MonoLabel>TARGET</MonoLabel>
            <MonoLabel className="
              hidden
              sm:block
            "
            >
              PLAYS
            </MonoLabel>
            <span />
          </div>

          {groups.length === 0 && (
            <p className="py-4 text-ui text-t4">No drums match</p>
          )}

          {groups.map((g) => (
            <div key={g.family} className="pt-3">
              <div
                data-testid="family"
                className="
                  border-b border-hairline pb-1 font-mono text-caption
                  tracking-[0.14em] text-t4
                "
              >
                {g.family}
              </div>
              {g.items.map((row) => {
                const tgtNote = row.tgtNote;
                const srcExpanded = pick?.canon === row.canon && pick.side === 'src';
                const tgtExpanded = pick?.canon === row.canon && pick.side === 'tgt';
                const rowChanged = changed.has(row.canon);
                return (
                  <Fragment key={row.canon}>
                    <VoiceRow
                      row={row}
                      effectiveTgt={tgtNote}
                      base={oct}
                      srcChanged={changedSrc.has(row.canon)}
                      tgtChanged={row.canon in edits}
                      srcExpanded={srcExpanded}
                      tgtExpanded={tgtExpanded}
                      onSrcToggle={() => (srcExpanded ? closePick() : openSrcPick(row.canon))}
                      onToggle={() => (tgtExpanded ? closePick() : openPick(row.canon))}
                      onDismiss={closePick}
                      result={playsOf(row, rowChanged, drumAt)}
                      onReset={rowChanged ? () => resetRow(row.canon) : undefined}
                    >
                      {srcExpanded && pick && (
                        <SourceNotePicker
                          voiceLabel={row.label}
                          currentNote={row.srcNotes[0] ?? null}
                          octIndex={pick.octIndex}
                          base={oct}
                          onSetOct={setPickOct}
                          onPickSemitone={chooseSrcNote}
                          onClose={closePick}
                        />
                      )}
                      {tgtExpanded && pick && (
                        <NotePicker
                          voiceLabel={row.label}
                          currentNote={tgtNote}
                          octIndex={pick.octIndex}
                          base={oct}
                          drums={targetDrums}
                          onSetOct={setPickOct}
                          onPickSemitone={chooseNote}
                          onPickNote={chooseNoteAbsolute}
                          onClose={closePick}
                        />
                      )}
                    </VoiceRow>
                    {notice?.canon === row.canon && (
                      <p role="status" className="px-1 pb-2 text-label text-t4">
                        {noteName(notice.note, oct)} was {notice.from} — now plays {row.label}
                      </p>
                    )}
                  </Fragment>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            aria-expanded={advanced}
            className={`
              self-start
              ${textAction()}
            `}
          >
            {advanced ? '▾' : '▸'} Advanced — reassign source notes
          </button>
          {advanced && (
            <SourceEditor
              notes={sourceNotes}
              srcEdits={srcEdits}
              options={canonOptions}
              base={oct}
              initialNote={assignNote}
              onSet={setSrcCanon}
              onClear={clearSrcCanon}
            />
          )}
        </div>
      </div>

      <section
        aria-label="Edit actions"
        className="
          sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2
          border-t border-hairline bg-card/95 px-5 py-3 backdrop-blur-sm
          sm:px-[30px]
        "
      >
        <span className="font-mono text-label text-t4">
          {changes === 0 ? 'No changes' : `${changes} change${changes === 1 ? '' : 's'}`}
        </span>
        <TextButton tone="danger" onClick={reset} disabled={changes === 0}>Reset all</TextButton>
        <span className="flex-1" />
        <div className="
          flex w-full flex-wrap items-center justify-end gap-3
          sm:w-auto
        "
        >
          <SavePreset
            src={src}
            tgt={tgt}
            existingPreset={existingPreset}
            atCap={presetsAtCap}
            onSave={onSavePreset}
            onUpdate={onUpdatePreset}
          />
          <Button variant="primary" size="md" onClick={() => setView('convert')}>
            Done
          </Button>
        </div>
      </section>
    </div>
  );
}
