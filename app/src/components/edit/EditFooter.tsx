import type { SavedMapping } from '../../lib/mappings';
import { Button } from '../Button';
import { TextButton } from '../TextButton';
import { SavePreset } from './SavePreset';

/** The editor's sticky footer: change count, Reset all, save as preset, Done. */
export function EditFooter({
  changes,
  onResetAll,
  src,
  tgt,
  existingPreset,
  presetsAtCap,
  onSavePreset,
  onUpdatePreset,
  onDone,
}: {
  changes: number;
  onResetAll: () => void;
  src: string;
  tgt: string;
  existingPreset: SavedMapping | undefined;
  presetsAtCap: boolean;
  onSavePreset: (name: string) => void;
  onUpdatePreset: (id: string, name: string) => void;
  onDone: () => void;
}) {
  return (
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
      <TextButton tone="danger" onClick={onResetAll} disabled={changes === 0}>Reset all</TextButton>
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
        <Button variant="primary" size="md" onClick={onDone}>
          Done
        </Button>
      </div>
    </section>
  );
}
