import type { Engine } from '../lib/midiremap';
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
        className="
          min-w-0 flex-1 truncate py-1.75 pl-3 text-[13px] leading-tight
        "
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
              shrink-0 px-2 text-[13px] transition-colors
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
      <MonoLabel className="mb-3">{label}</MonoLabel>
      <FilterInput value={q} onChange={setQ} ariaLabel={`Filter ${label} engines`} />
      <div className="mr-scroll flex max-h-60 flex-col">
        {filtered.length === 0
          ? (
              <span className="py-1.75 pl-3 font-mono text-[11px] text-t5">no matches</span>
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
