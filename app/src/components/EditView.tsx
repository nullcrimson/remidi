import { Fragment, useState } from 'react';
import { noteName, type OctaveBase } from '../lib/notes';
import type { Editor } from '../hooks/useEditor';
import { MAPPINGS_CAP, type SavedMapping } from '../lib/mappings';
import { shortCode } from '../lib/format';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { MonoLabel } from './MonoLabel';
import { NotePicker } from './NotePicker';
import { SourceEditor } from './SourceEditor';
import { SourceNotePicker } from './SourceNotePicker';
import { textAction } from './styles';
import { TextButton } from './TextButton';
import { TextField } from './TextField';
import { Tooltip, TooltipBody } from './Tooltip';
import { VoiceRow } from './VoiceRow';

export interface EditViewProps {
  editor: Editor;
  src: string;
  tgt: string;
  oct: OctaveBase;
  existingPreset: SavedMapping | undefined;
  presetsAtCap: boolean;
  assignNote?: number | null;
  setView: (v: 'convert' | 'edit') => void;
  onSavePreset: (name: string) => void;
  onUpdatePreset: (id: string, name: string) => void;
}

function SavePreset({
  src,
  tgt,
  canSave,
  existingPreset,
  atCap,
  onSave,
  onUpdate,
}: {
  src: string;
  tgt: string;
  canSave: boolean;
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
            Saves the FROM→TO pair and your note overrides as a chip on the main
            screen — one click reloads it. Kept in this browser only.
          </TooltipBody>
        )}
      >
        <button type="button" onClick={open} disabled={!canSave} className={textAction()}>
          {existingPreset ? 'Update preset' : 'Save preset'}
        </button>
      </Tooltip>
    );
  }

  return (
    <div
      className="
        flex flex-col gap-2 rounded-panel border border-hairline bg-inset p-3
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

export function EditView({
  editor,
  src,
  tgt,
  oct,
  existingPreset,
  presetsAtCap,
  assignNote = null,
  setView,
  onSavePreset,
  onUpdatePreset,
}: EditViewProps) {
  const {
    rows,
    edits,
    srcEdits,
    pick,
    notice,
    targetDrums,
    sourceNotes,
    canonOptions,
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
  const canSave
    = Object.keys(edits).length > 0 || Object.keys(srcEdits).length > 0;
  const [advanced, setAdvanced] = useState(assignNote !== null);
  const srcOverridden = new Set(Object.values(srcEdits));

  return (
    <div className="flex flex-col gap-5 p-[26px_30px_24px]">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <TextButton onClick={() => setView('convert')}>← back</TextButton>
          <span className="text-body font-semibold text-t1">
            Edit mapping
          </span>
        </div>
        <span className="font-mono text-label text-t4">
          {shortCode(src)} → {shortCode(tgt)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_16px_auto] gap-3 pb-1">
        <MonoLabel>DRUM</MonoLabel>
        <MonoLabel className="justify-self-end">SOURCE</MonoLabel>
        <span />
        <MonoLabel className="justify-self-end">TARGET</MonoLabel>
      </div>

      <div>
        {rows.map((row) => {
          const tgtNote = row.tgtNote;
          const srcExpanded = pick?.canon === row.canon && pick.side === 'src';
          const tgtExpanded = pick?.canon === row.canon && pick.side === 'tgt';
          return (
            <Fragment key={row.canon}>
              <VoiceRow
                row={row}
                effectiveTgt={tgtNote}
                base={oct}
                srcChanged={srcOverridden.has(row.canon) || row.srcNotes.length === 0}
                tgtChanged={row.canon in edits}
                srcExpanded={srcExpanded}
                tgtExpanded={tgtExpanded}
                onSrcToggle={() =>
                  srcExpanded ? closePick() : openSrcPick(row.canon)}
                onToggle={() => (tgtExpanded ? closePick() : openPick(row.canon))}
                onDismiss={closePick}
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

      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="font-mono text-label text-t5">
          <span className="text-accent">●</span> = remapped
        </span>
        <div className="flex items-center gap-3">
          <SavePreset
            src={src}
            tgt={tgt}
            canSave={canSave}
            existingPreset={existingPreset}
            atCap={presetsAtCap}
            onSave={onSavePreset}
            onUpdate={onUpdatePreset}
          />
          <Button variant="primary" size="md" onClick={() => setView('convert')}>
            <span>✓</span>Save mapping
          </Button>
        </div>
      </div>
    </div>
  );
}
