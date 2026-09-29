import { useT } from '../localeContext';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { FocusRef } from '../hooks/useFocusIntent';
import type { Engine } from '../lib/midiremap';
import { revealScrollTop } from '../lib/reveal';
import { useFilter } from '../hooks/useFilter';
import { useTruncationTooltip } from '../hooks/useTruncationTooltip';
import { FilterInput } from './FilterInput';
import { MonoLabel } from './MonoLabel';

const PAGE = 8;

function reveal(list: HTMLElement, row: HTMLElement) {
  const next = revealScrollTop(
    { top: row.offsetTop, height: row.offsetHeight },
    { scrollTop: list.scrollTop, height: list.clientHeight },
  );
  if (next !== null) list.scrollTop = next;
}

export function LibraryList({
  label,
  value,
  engines,
  onChange,
  disabledId,
  favorites,
  onToggleFavorite,
  filterRef,
}: {
  filterRef?: FocusRef;
  label: string;
  value: string;
  engines: Engine[];
  onChange: (id: string) => void;
  disabledId?: string;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}) {
  const t = useT();
  const { q, setQ, filtered } = useFilter(engines, (e) => `${e.name} ${e.fullName}`);
  const { show, hide, tooltip } = useTruncationTooltip();
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const hintId = `${baseId}-hint`;
  const optionId = (id: string) => `${baseId}-opt-${id}`;
  const [focused, setFocused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [followSelection, setFollowSelection] = useState(true);

  const starred = filtered.filter((e) => favorites.has(e.id));
  const rest = filtered.filter((e) => !favorites.has(e.id));
  const enabled = [...starred, ...rest].filter((e) => e.id !== disabledId);
  const active
    = enabled.find((e) => e.id === activeId)
      ?? (followSelection ? enabled.find((e) => e.id === value) : undefined)
      ?? enabled[0];
  const chosen = engines.find((e) => e.id === value);

  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && row) reveal(list, row);
  }, [value]);

  const activeKey = focused ? active?.id : undefined;
  useEffect(() => {
    const list = listRef.current;
    if (!list || activeKey === undefined) return;
    const row = document.getElementById(`${baseId}-opt-${activeKey}`);
    if (row) reveal(list, row);
  }, [activeKey, baseId]);

  const pick = (id: string) => {
    onChange(id);
    setQ('');
    setActiveId(id);
    setFollowSelection(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const at = active ? enabled.indexOf(active) : -1;
    const move = (by: number) => {
      e.preventDefault();
      const next = enabled[Math.max(0, Math.min(enabled.length - 1, at + by))];
      if (next) setActiveId(next.id);
    };
    switch (e.key) {
      case 'ArrowDown':
        return move(1);
      case 'ArrowUp':
        return move(-1);
      case 'PageDown':
        return move(PAGE);
      case 'PageUp':
        return move(-PAGE);
      case 'Enter':
        if (!active) return;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) onToggleFavorite(active.id);
        else pick(active.id);
    }
  };

  const option = (e: Engine) => {
    const fav = favorites.has(e.id);
    const selected = e.id === value;
    const disabled = e.id === disabledId;
    const highlighted = focused && e.id === active?.id;
    return (
      <div
        key={e.id}
        id={optionId(e.id)}
        role="option"
        aria-label={e.name}
        aria-selected={selected}
        aria-disabled={disabled || undefined}
        onMouseDown={(ev) => ev.preventDefault()}
        onClick={() => {
          if (!disabled) pick(e.id);
        }}
        className={`
          flex items-stretch border-l-2 transition-colors
          pointer-coarse:min-h-11
          ${highlighted ? 'bg-accent/8' : ''}
          ${
      disabled
        ? 'cursor-not-allowed border-transparent text-t5 opacity-40'
        : selected
          ? 'cursor-pointer border-accent font-semibold text-t1'
          : `
            cursor-pointer border-transparent text-t4
            hover:text-t1
          `
      }
          ${highlighted && !selected && !disabled ? 'text-t1' : ''}
        `}
      >
        <span
          onMouseEnter={(ev) =>
            show(ev.currentTarget, e.fullName, e.fullName !== e.name)}
          onMouseLeave={hide}
          className="
            min-w-0 flex-1 self-center truncate py-1.75 pl-3 text-ui/tight
          "
        >
          {e.name}
        </span>
        <span
          data-testid={`star-${e.id}`}
          aria-hidden="true"
          onClick={(ev) => {
            ev.stopPropagation();
            onToggleFavorite(e.id);
          }}
          className={`
            tap flex shrink-0 cursor-pointer items-center justify-center px-2
            text-ui transition-colors
            pointer-coarse:w-11
            ${
      fav
        ? 'text-star text-shadow-star'
        : `
          text-t5
          hover:text-t2
        `
      }
          `}
        >
          {fav ? '★' : '☆'}
        </span>
      </div>
    );
  };

  const grouped = starred.length > 0 && rest.length > 0;

  return (
    <div role="group" aria-label={t({ id: 'library-group', args: { side: label } })}>
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
      <FilterInput
        value={q}
        onChange={(v) => {
          setQ(v);
          setActiveId(null);
          setFollowSelection(v === '');
        }}
        ariaLabel={t({ id: 'library-filter', args: { side: label } })}
        placeholder={t({ id: 'library-filter-placeholder' })}
        inputRef={filterRef}
        inputProps={{
          role: 'combobox',
          'aria-expanded': true,
          'aria-controls': listId,
          'aria-autocomplete': 'list',
          'aria-activedescendant': active ? optionId(active.id) : undefined,
          'aria-describedby': hintId,
          onKeyDown,
          onFocus: () => setFocused(true),
          onBlur: () => setFocused(false),
        }}
      />
      <span id={hintId} className="sr-only">{t({ id: 'library-hint' })}</span>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-label={t({ id: 'library-list', args: { side: label } })}
        className="mr-scroll relative flex max-h-60 flex-col"
      >
        {grouped
          ? (
              <>
                <div
                  role="group"
                  aria-label={t({ id: 'library-favourites' })}
                  className="mb-1 border-b border-hairline pb-1"
                >
                  {starred.map(option)}
                </div>
                <div role="group" aria-label={t({ id: 'library-all' })}>
                  {rest.map(option)}
                </div>
              </>
            )
          : [...starred, ...rest].map(option)}
      </div>
      {filtered.length === 0 && (
        <span className="block py-1.75 pl-3 font-mono text-label text-t5">{t({ id: 'library-none' })}</span>
      )}
      {tooltip}
    </div>
  );
}
