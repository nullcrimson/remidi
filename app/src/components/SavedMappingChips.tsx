import { useState } from 'react';
import type { Engine } from '../lib/midiremap';
import type { SavedMapping } from '../lib/mappings';
import { shortCode } from '../lib/format';

export function SavedMappingChips({
  mappings,
  engines,
  onLoad,
  onDelete,
  onRename,
}: {
  mappings: SavedMapping[];
  engines: Engine[];
  onLoad: (m: SavedMapping) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  if (mappings.length === 0) return null;
  const known = (id: string) => engines.some((e) => e.id === id);

  const startEdit = (m: SavedMapping) => {
    setDraft(m.name);
    setEditingId(m.id);
  };
  const commit = (id: string) => {
    const name = draft.trim();
    if (name) onRename(id, name);
    setEditingId(null);
  };

  return (
    <div
      role="group"
      aria-label="Saved mappings"
      className="flex flex-col gap-2"
    >
      <span className="font-mono text-[10px] tracking-[0.14em] text-t5">
        SAVED
      </span>
      <ul className="flex flex-wrap gap-2">
        {mappings.map((m) => {
          const stale = !known(m.src) || !known(m.tgt);
          return (
            <li
              key={m.id}
              className="
                flex items-stretch overflow-hidden rounded-[9px] border
                border-hairline bg-field
              "
            >
              {editingId === m.id ? (
                <div className="flex items-center gap-1 p-1">
                  <input
                    value={draft}
                    autoFocus
                    aria-label={`Rename ${m.name}`}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commit(m.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="
                      w-32 min-w-0 rounded-md border border-field-border
                      bg-field px-2 py-1.25 font-mono text-[11px] text-t2
                      transition-colors outline-none
                      focus:border-accent/40
                    "
                  />
                  <button
                    type="button"
                    aria-label="Save name"
                    onClick={() => commit(m.id)}
                    className="
                      flex size-6 shrink-0 items-center justify-center
                      rounded-md text-[12px] text-star
                      hover:bg-white/5
                    "
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel rename"
                    onClick={() => setEditingId(null)}
                    className="
                      flex size-6 shrink-0 items-center justify-center
                      rounded-md text-[12px] text-t5
                      hover:bg-white/5 hover:text-t2
                    "
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={stale}
                    onClick={() => onLoad(m)}
                    title={
                      stale
                        ? 'engine unavailable'
                        : `${Object.keys(m.edits).length + Object.keys(m.srcEdits).length} overrides`
                    }
                    className="
                      flex min-w-0 items-center gap-2 py-1.5 pr-2 pl-2.5
                      text-left text-[12px]
                      enabled:hover:bg-white/3
                      disabled:opacity-40
                    "
                  >
                    <span className="max-w-40 truncate text-t2">{m.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-t5">
                      {shortCode(m.src)}→{shortCode(m.tgt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Rename preset ${m.name}`}
                    onClick={() => startEdit(m)}
                    className="
                      flex w-6 shrink-0 items-center justify-center border-l
                      border-hairline text-[11px] text-t5 transition-colors
                      hover:bg-white/5 hover:text-t2
                    "
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete preset ${m.name}`}
                    onClick={() => onDelete(m.id)}
                    className="
                      flex w-6 shrink-0 items-center justify-center border-l
                      border-hairline text-[12px] text-t5 transition-colors
                      hover:bg-danger/10 hover:text-danger
                    "
                  >
                    ×
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
