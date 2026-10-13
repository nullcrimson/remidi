import { useState } from 'react';
import type { PresetName } from '../core/midiremap';
import { useT } from '../locale/localeContext';
import { IconButton } from '../ui/IconButton';
import { TextField } from '../ui/TextField';
import { parsePresetName } from './mappings';

/** The name field a chip turns into while its preset is renamed; `onDone` gets the new name, or null when cancelled or blank. */
export function ChipRename({ name, onDone }: { name: PresetName; onDone: (name: PresetName | null) => void }) {
  const t = useT();
  const [draft, setDraft] = useState<string>(name);
  const commit = () => onDone(parsePresetName(draft.trim()));
  return (
    <div className="flex items-center gap-1 p-1">
      <TextField
        mono
        value={draft}
        autoFocus
        aria-label={t({ id: 'chip-rename-label', args: { name } })}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onDone(null);
        }}
        className="w-32 min-w-0"
      />
      <IconButton label={t({ id: 'chip-rename-save' })} size="sm" onClick={commit}>✓</IconButton>
      <IconButton label={t({ id: 'chip-rename-cancel' })} size="sm" onClick={() => onDone(null)}>×</IconButton>
    </div>
  );
}
