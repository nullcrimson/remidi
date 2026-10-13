import { useT } from '../locale/localeContext';
import type { EnginePair } from '../core/enginePair';
import type { PresetName } from '../core/midiremap';
import type { SavedMapping } from '../presets/mappings';
import { UnsavedNotice } from '../presets/UnsavedNotice';
import { Button } from '../ui/Button';
import { TextButton } from '../ui/TextButton';
import { SavePreset } from './SavePreset';

/** The editor's sticky footer: change count, Reset all, save as preset, Done. */
export function EditFooter({
  changes,
  onResetAll,
  pair,
  existingPreset,
  presetsAtCap,
  presetsUnsaved,
  onSavePreset,
  onUpdatePreset,
  onDone,
}: {
  changes: number;
  onResetAll: () => void;
  pair: EnginePair;
  existingPreset: SavedMapping | undefined;
  presetsAtCap: boolean;
  presetsUnsaved: boolean;
  onSavePreset: (name: PresetName) => void;
  onUpdatePreset: (id: string, name: PresetName) => void;
  onDone: () => void;
}) {
  const t = useT();
  return (
    <section
      aria-label={t({ id: 'edit-actions' })}
      className="
        sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2
        border-t border-hairline bg-card/95 px-5 py-3 backdrop-blur-sm
        sm:px-[30px]
      "
    >
      {presetsUnsaved && (
        <div className="w-full">
          <UnsavedNotice />
        </div>
      )}
      <span className="font-mono text-label text-t4">
        {t({ id: 'edit-changes', args: { count: changes } })}
      </span>
      <TextButton tone="danger" onClick={onResetAll} disabled={changes === 0}>{t({ id: 'edit-reset-all' })}</TextButton>
      <span className="flex-1" />
      <div className="
        flex w-full flex-wrap items-center justify-end gap-3
        sm:w-auto
      "
      >
        <SavePreset
          pair={pair}
          existingPreset={existingPreset}
          atCap={presetsAtCap}
          onSave={onSavePreset}
          onUpdate={onUpdatePreset}
        />
        <Button variant="primary" size="md" onClick={onDone}>
          {t({ id: 'edit-done' })}
        </Button>
      </div>
    </section>
  );
}
