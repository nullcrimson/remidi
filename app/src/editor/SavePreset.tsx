import { useT } from '../locale/localeContext';
import { useState } from 'react';
import type { PresetName } from '../core/midiremap';
import { MAPPINGS_CAP, parsePresetName, type SavedMapping } from '../presets/mappings';
import { engineCode } from '../core/engineCode';
import type { EnginePair } from '../core/enginePair';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { TextField } from '../ui/TextField';
import { Tooltip, TooltipBody } from '../ui/Tooltip';

/** Saves the open pair and its edits as a preset, or updates the one it came from. */
export function SavePreset({
  pair,
  existingPreset,
  atCap,
  onSave,
  onUpdate,
}: {
  pair: EnginePair;
  existingPreset: SavedMapping | undefined;
  atCap: boolean;
  onSave: (name: PresetName) => void;
  onUpdate: (id: string, name: PresetName) => void;
}) {
  const t = useT();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const pairLabel = `${engineCode(pair.src)}→${engineCode(pair.tgt)}`;

  const open = () => {
    setName(existingPreset?.name ?? pairLabel);
    setNaming(true);
  };
  const parsed = parsePresetName(name.trim());
  const saveNew = () => {
    if (!parsed || atCap) return;
    onSave(parsed);
    setNaming(false);
  };
  const saveUpdate = () => {
    if (!parsed || !existingPreset) return;
    onUpdate(existingPreset.id, parsed);
    setNaming(false);
  };
  const primary = () => (existingPreset ? saveUpdate() : saveNew());

  if (!naming) {
    return (
      <Tooltip
        content={(
          <TooltipBody title={t({ id: 'preset-tip-title' })}>
            {t({ id: 'preset-tip' })}
          </TooltipBody>
        )}
      >
        <span className="inline-flex">
          <Button variant="secondary" size="sm" onClick={open}>
            {t({ id: existingPreset ? 'preset-update-open' : 'preset-save-open' })}
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
          aria-label={t({ id: 'preset-name' })}
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
                <Button variant="primary" size="sm" onClick={saveUpdate} disabled={!parsed}>
                  {t({ id: 'preset-update' })}
                </Button>
                <Button variant="secondary" size="sm" onClick={saveNew} disabled={!parsed || atCap}>
                  {t({ id: 'preset-save-new' })}
                </Button>
              </>
            )
          : (
              <Button variant="primary" size="sm" onClick={saveNew} disabled={!parsed || atCap}>
                {t({ id: 'preset-save' })}
              </Button>
            )}
        <IconButton label={t({ id: 'cancel' })} onClick={() => setNaming(false)}>×</IconButton>
      </div>
      {existingPreset && (
        <p className="text-label text-t5">
          {t({ id: 'preset-exists', args: { pair: pairLabel } })}
        </p>
      )}
      {atCap && !existingPreset && (
        <p className="text-label text-danger">
          {t({ id: 'preset-at-cap', args: { cap: MAPPINGS_CAP } })}
        </p>
      )}
    </div>
  );
}
