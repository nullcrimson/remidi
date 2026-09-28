import { useState } from 'react';
import { MAPPINGS_CAP, type SavedMapping } from '../../lib/mappings';
import { shortCode } from '../../lib/format';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { TextField } from '../TextField';
import { Tooltip, TooltipBody } from '../Tooltip';

/** Saves the open pair and its edits as a preset, or updates the one it came from. */
export function SavePreset({
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
