import { useRef, useState } from 'react';
import { useT } from '../locale/localeContext';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';
import type { Engine, EngineId } from '../core/midiremap';
import type { FocusRef } from '../ui/useFocusIntent';
import { pillState, type RowState } from '../ui/styles';
import { Modal } from '../ui/Modal';
import { EngineCard } from './EngineCard';
import { LibraryList } from './LibraryList';
import { useFavorites } from './useFavorites';

/**
 * One side of the conversion: its card, its favourites to pick in one press,
 * and the picker the card opens with every engine.
 */
export function EngineSide({ side, label, value, disabledId, engines, next, onChange, cardRef }: {
  side: StatEvents['engine-picked']['side'];
  label: string;
  value: EngineId | null;
  disabledId: EngineId | null;
  engines: Engine[];
  next: boolean;
  onChange: (id: EngineId) => void;
  cardRef: FocusRef;
}) {
  const t = useT();
  const { favorites, toggleFavorite } = useFavorites(side);
  const [open, setOpen] = useState(false);
  const filter = useRef<HTMLElement | null>(null);
  const chosen = engines.find((e) => e.id === value)?.name ?? null;
  const quick = engines.filter((e) => favorites.has(e.id));
  const stateOf = (id: EngineId): RowState =>
    id === disabledId ? 'disabled' : id === value ? 'selected' : 'idle';
  return (
    <div
      role="group"
      aria-label={t({ id: 'library-group', args: { side: label } })}
      className="flex min-w-0 flex-col gap-2"
    >
      <EngineCard ref={cardRef} label={label} chosen={chosen} next={next} onOpen={() => setOpen(true)} />
      {quick.length > 0 && (
        <ul
          aria-label={t({ id: 'library-favourites' })}
          className="flex flex-wrap gap-1.5"
        >
          {quick.map((e) => {
            const state = stateOf(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  aria-pressed={state === 'selected'}
                  aria-disabled={state === 'disabled' || undefined}
                  onClick={() => {
                    if (state !== 'idle') return;
                    track('engine-picked', { side, id: e.id, via: 'favorite' });
                    onChange(e.id);
                  }}
                  className={`
                    tap inline-flex items-center gap-1 rounded-full border
                    px-2.5 py-0.5 text-label transition-colors
                    pointer-coarse:min-h-11
                    ${pillState(state)}
                  `}
                >
                  <span aria-hidden="true" className="text-star">★</span>
                  {e.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && (
        <Modal
          open
          layout="sheet"
          heading={t({ id: 'engine-picker-heading', args: { side: label } })}
          initialFocus={filter}
          onClose={() => setOpen(false)}
        >
          <LibraryList
            side={side}
            label={label}
            value={value}
            disabledId={disabledId}
            engines={engines}
            onChange={(id) => {
              onChange(id);
              setOpen(false);
            }}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            filterRef={(el) => {
              filter.current = el;
            }}
          />
        </Modal>
      )}
    </div>
  );
}
