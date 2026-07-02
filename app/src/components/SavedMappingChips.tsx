import type { Engine } from '../lib/midiremap';
import type { SavedMapping } from '../lib/mappings';
import { SavedMappingChip } from './SavedMappingChip';

export function SavedMappingChips({
  mappings,
  engines,
  atCap,
  onLoad,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
}: {
  mappings: SavedMapping[];
  engines: Engine[];
  atCap: boolean;
  onLoad: (m: SavedMapping) => void;
  onEdit: (m: SavedMapping) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (m: SavedMapping) => void;
  onDelete: (id: string) => void;
}) {
  if (mappings.length === 0) return null;
  const known = (id: string) => engines.some((e) => e.id === id);

  return (
    <div role="group" aria-label="Saved mappings" className="flex flex-col gap-2">
      <span className="font-mono text-[10px] tracking-[0.14em] text-t5">
        SAVED
      </span>
      <ul className="flex flex-wrap gap-2">
        {mappings.map((m) => (
          <SavedMappingChip
            key={m.id}
            mapping={m}
            known={known(m.src) && known(m.tgt)}
            atCap={atCap}
            onLoad={onLoad}
            onEdit={onEdit}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}
