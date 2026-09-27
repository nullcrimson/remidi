import { useEffect, useRef } from 'react';
import type { Engine } from '../lib/midiremap';
import { revealScrollTop } from '../lib/reveal';
import { useFilter } from '../hooks/useFilter';
import { useTruncationTooltip } from '../hooks/useTruncationTooltip';
import { FilterInput } from './FilterInput';
import { ListRow } from './ListRow';
import { MonoLabel } from './MonoLabel';

export function LibraryList({
  label,
  value,
  engines,
  onChange,
  disabledId,
  favorites,
  onToggleFavorite,
}: {
  label: string;
  value: string;
  engines: Engine[];
  onChange: (id: string) => void;
  disabledId?: string;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}) {
  const { q, setQ, filtered } = useFilter(engines, (e) => e.name);
  const { show, hide, tooltip } = useTruncationTooltip();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !row) return;
    const next = revealScrollTop(
      { top: row.offsetTop, height: row.offsetHeight },
      { scrollTop: list.scrollTop, height: list.clientHeight },
    );
    if (next !== null) list.scrollTop = next;
  }, [value]);

  const chosen = engines.find((e) => e.id === value);
  const starred = filtered.filter((e) => favorites.has(e.id));
  const rest = filtered.filter((e) => !favorites.has(e.id));

  const row = (e: Engine) => {
    const fav = favorites.has(e.id);
    return (
      <ListRow
        key={e.id}
        selected={e.id === value}
        disabled={e.id === disabledId}
        onSelect={() => onChange(e.id)}
        className="min-w-0 flex-1 truncate py-1.75 pl-3 text-ui/tight"
        hoverProps={{
          onMouseEnter: (ev) => show(ev.currentTarget, e.name),
          onMouseLeave: hide,
          onFocus: (ev) => show(ev.currentTarget, e.name),
          onBlur: hide,
        }}
        trailing={(
          <button
            type="button"
            aria-pressed={fav}
            aria-label={`${fav ? 'Unfavorite' : 'Favorite'} ${e.name}`}
            onClick={() => onToggleFavorite(e.id)}
            className={`
              shrink-0 px-2 text-ui transition-colors
              ${
          fav
            ? 'text-star [text-shadow:0_0_8px_rgba(224,196,106,0.55)]'
            : `
              text-t5
              hover:text-t2
            `
          }
            `}
          >
            {fav ? '★' : '☆'}
          </button>
        )}
      >
        {e.name}
      </ListRow>
    );
  };

  return (
    <div role="group" aria-label={`${label} engine`}>
      <div className="mb-3 flex min-w-0 items-baseline gap-2">
        <MonoLabel>{label}</MonoLabel>
        {chosen && (
          <>
            <span aria-hidden="true" className="text-caption text-decor">·</span>
            <span
              data-testid="chosen-engine"
              className="min-w-0 truncate text-label text-t2"
            >
              {chosen.name}
            </span>
          </>
        )}
      </div>
      <FilterInput value={q} onChange={setQ} ariaLabel={`Filter ${label} engines`} />
      <div ref={listRef} className="mr-scroll relative flex max-h-60 flex-col">
        {filtered.length === 0
          ? (
              <span className="py-1.75 pl-3 font-mono text-label text-t5">no matches</span>
            )
          : (
              <>
                {starred.map(row)}
                {starred.length > 0 && rest.length > 0 && (
                  <div
                    data-testid="fav-divider"
                    className="my-1 border-t border-hairline"
                  />
                )}
                {rest.map(row)}
              </>
            )}
      </div>
      {tooltip}
    </div>
  );
}
