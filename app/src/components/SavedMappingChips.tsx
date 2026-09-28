import { useRef } from 'react';
import { flushSync } from 'react-dom';
import type { Engine } from '../lib/midiremap';
import type { SavedMapping } from '../lib/mappings';
import { MonoLabel } from './MonoLabel';
import { SavedMappingChip } from './SavedMappingChip';

export function SavedMappingChips({
  mappings,
  engines,
  atCap,
  onFocusFallback,
  onLoad,
  onEdit,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}: {
  mappings: SavedMapping[];
  engines: Engine[];
  atCap: boolean;
  /** Where focus goes when the last chip is deleted. */
  onFocusFallback?: () => void;
  onLoad: (m: SavedMapping) => void;
  onEdit: (m: SavedMapping) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (m: SavedMapping) => void;
  onExport: (m: SavedMapping) => void;
  onDelete: (id: string) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const remove = (id: string) => {
    const at = mappings.findIndex((m) => m.id === id);
    flushSync(() => onDelete(id));
    const chips = listRef.current?.querySelectorAll<HTMLElement>('[data-chip-main]') ?? [];
    const next = chips[Math.min(at, chips.length - 1)];
    if (next) next.focus();
    else onFocusFallback?.();
  };
  if (mappings.length === 0) return null;
  const known = (id: string) => engines.some((e) => e.id === id);

  return (
    <div
      role="group"
      aria-label="Saved mappings"
      className="flex flex-col gap-2"
    >
      <MonoLabel>SAVED</MonoLabel>
      <ul ref={listRef} className="flex flex-wrap gap-2">
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
            onExport={onExport}
            onDelete={remove}
          />
        ))}
      </ul>
    </div>
  );
}
