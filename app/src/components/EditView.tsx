import { useState } from 'react';
import type { OctaveBase } from '../lib/notes';
import type { Editor } from '../hooks/useEditor';
import { MAPPINGS_CAP, type SavedMapping } from '../lib/mappings';
import { shortCode } from '../lib/format';
import { Button } from './Button';
import { NotePicker } from './NotePicker';
import { SourceEditor } from './SourceEditor';
import { SourceNotePicker } from './SourceNotePicker';
import { Tooltip, TooltipBody } from './Tooltip';
import { VoiceRow } from './VoiceRow';

export interface EditViewProps {
  editor: Editor;
  src: string;
  tgt: string;
  oct: OctaveBase;
  existingPreset: SavedMapping | undefined;
  presetsAtCap: boolean;
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
        content={
          <TooltipBody title="Reuse this mapping">
            Saves the FROM→TO pair and your note overrides as a chip on the main
            screen — one click reloads it. Kept in this browser only.
          </TooltipBody>
        }
      >
        <button
          type="button"
          onClick={open}
          disabled={!canSave}
          className="
            text-[12px] text-t4 transition-colors
            enabled:hover:text-accent
            disabled:opacity-40
          "
        >
          {existingPreset ? 'Update preset' : 'Save preset'}
        </button>
      </Tooltip>
    );
  }

  return (
    <div
      className="
        flex flex-col gap-2 rounded-[10px] border border-hairline bg-inset p-3
      "
    >
      <div className="flex items-center gap-2">
        <input
          value={name}
          autoFocus
          aria-label="Preset name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') primary();
            if (e.key === 'Escape') setNaming(false);
          }}
          className="
            min-w-0 flex-1 rounded-[7px] border border-field-border bg-field
            px-2.5 py-1.5 text-[13px] text-t1 outline-none
          "
        />
        {existingPreset ? (
          <>
            <button
              type="button"
              onClick={saveUpdate}
              disabled={!trimmed}
              className="
                rounded-[7px] bg-accent px-3 py-1.5 text-[12px] font-semibold
                text-ink transition
                enabled:hover:brightness-110
                disabled:opacity-40
              "
            >
              Update
            </button>
            <button
              type="button"
              onClick={saveNew}
              disabled={!trimmed || atCap}
              className="
                rounded-[7px] border border-field-border px-3 py-1.5 text-[12px]
                text-t3 transition-colors
                enabled:hover:text-t1
                disabled:opacity-40
              "
            >
              Save new
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={saveNew}
            disabled={!trimmed || atCap}
            className="
              rounded-[7px] bg-accent px-3 py-1.5 text-[12px] font-semibold
              text-ink transition
              enabled:hover:brightness-110
              disabled:opacity-40
            "
          >
            Save
          </button>
        )}
        <button
          type="button"
          aria-label="Cancel"
          onClick={() => setNaming(false)}
          className="
            flex size-6 items-center justify-center rounded-md bg-white/5
            text-[14px] text-t4
            hover:text-t2
          "
        >
          ×
        </button>
      </div>
      {existingPreset && (
        <p className="text-[11px] text-t5">
          A preset for {pairLabel} already exists.
        </p>
      )}
      {atCap && !existingPreset && (
        <p className="text-[11px] text-danger">
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
  setView,
  onSavePreset,
  onUpdatePreset,
}: EditViewProps) {
  const {
    rows,
    edits,
    srcEdits,
    pick,
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
  const canSave = Object.keys(edits).length > 0 || Object.keys(srcEdits).length > 0;
  const [advanced, setAdvanced] = useState(false);
  const srcOverridden = new Set(Object.values(srcEdits));

  return (
    <div className="flex flex-col gap-5 p-[26px_30px_24px]">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <button
            type="button"
            onClick={() => setView('convert')}
            className="
              text-[12px] text-t4
              hover:text-accent
            "
          >
            ← back
          </button>
          <span className="text-[14px] font-semibold text-t1">
            Edit mapping
          </span>
        </div>
        <span className="font-mono text-[11px] text-t4">
          {shortCode(src)} → {shortCode(tgt)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_16px_auto] gap-3 pb-1">
        <span className="font-mono text-[9.5px] tracking-[0.14em] text-t5">DRUM</span>
        <span className="
          justify-self-end font-mono text-[9.5px] tracking-[0.14em] text-t5
        ">
          SOURCE
        </span>
        <span />
        <span className="
          justify-self-end font-mono text-[9.5px] tracking-[0.14em] text-t5
        ">
          TARGET
        </span>
      </div>

      <div>
        {rows.map((row) => {
          const tgtNote = row.tgtNote;
          const srcExpanded = pick?.canon === row.canon && pick.side === 'src';
          const tgtExpanded = pick?.canon === row.canon && pick.side === 'tgt';
          return (
            <VoiceRow
              key={row.canon}
              row={row}
              effectiveTgt={tgtNote}
              base={oct}
              srcChanged={srcOverridden.has(row.canon)}
              tgtChanged={row.canon in edits}
              srcExpanded={srcExpanded}
              tgtExpanded={tgtExpanded}
              onSrcToggle={() => (srcExpanded ? closePick() : openSrcPick(row.canon))}
              onToggle={() => (tgtExpanded ? closePick() : openPick(row.canon))}
              onDismiss={closePick}
            >
              {srcExpanded && pick && (
                <SourceNotePicker
                  voiceLabel={row.label}
                  currentNote={row.srcNote}
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
                  currentNote={tgtNote ?? row.srcNote}
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
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="
            self-start text-[11px] text-t5 transition-colors
            hover:text-t3
          "
        >
          {advanced ? '▾' : '▸'} Advanced — reassign source notes
        </button>
        {advanced && (
          <SourceEditor
            notes={sourceNotes}
            srcEdits={srcEdits}
            options={canonOptions}
            base={oct}
            onSet={setSrcCanon}
            onClear={clearSrcCanon}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="font-mono text-[11px] text-t5">
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
          <Button variant="solid" onClick={() => setView('convert')}>
            <span>✓</span>Save mapping
          </Button>
        </div>
      </div>
    </div>
  );
}
