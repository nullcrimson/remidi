import { useState } from "react";
import type { Engine } from "../lib/midiremap";

interface Tip {
  name: string;
  x: number;
  y: number;
}

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
  const [q, setQ] = useState("");
  const [tip, setTip] = useState<Tip | null>(null);
  const needle = q.trim().toLowerCase();

  const showTip = (el: HTMLElement, name: string) => {
    if (el.scrollWidth <= el.clientWidth) return;
    const r = el.getBoundingClientRect();
    setTip({ name, x: r.left, y: r.bottom });
  };
  const hideTip = () => setTip(null);
  const filtered = needle
    ? engines.filter((e) => e.name.toLowerCase().includes(needle))
    : engines;
  const starred = filtered.filter((e) => favorites.has(e.id));
  const rest = filtered.filter((e) => !favorites.has(e.id));

  const row = (e: Engine) => {
    const sel = e.id === value;
    const disabled = e.id === disabledId;
    const fav = favorites.has(e.id);
    return (
      <div key={e.id} className="flex items-stretch">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={sel}
          onClick={() => onChange(e.id)}
          onMouseEnter={(ev) => showTip(ev.currentTarget, e.name)}
          onMouseLeave={hideTip}
          onFocus={(ev) => showTip(ev.currentTarget, e.name)}
          onBlur={hideTip}
          className={`
            min-w-0 flex-1 truncate border-l-2 py-1.75 pl-3 text-left
            text-[13px] leading-tight transition-colors
            ${
              disabled
                ? "cursor-not-allowed border-transparent text-t6 opacity-40"
                : sel
                  ? "border-accent font-semibold text-t1"
                  : `
                    border-transparent text-t4
                    hover:text-t1
                  `
            }
          `}
        >
          {e.name}
        </button>
        <button
          type="button"
          aria-pressed={fav}
          aria-label={`${fav ? "Unfavorite" : "Favorite"} ${e.name}`}
          onClick={() => onToggleFavorite(e.id)}
          className={`
            shrink-0 px-2 text-[13px] transition-colors
            ${
              fav
                ? "text-star"
                : `
                  text-t5
                  hover:text-t2
                `
            }
          `}
        >
          {fav ? "★" : "☆"}
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-3 font-mono text-[10px] tracking-[0.14em] text-t5">
        {label}
      </div>
      <div className="relative mb-2">
        <span
          className="
            pointer-events-none absolute top-1/2 left-2 -translate-y-1/2
            text-[11px] text-t5
          "
        >
          ⌕
        </span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={`Filter ${label} engines`}
          placeholder="filter…"
          className="
            w-full rounded-md border border-white/8 bg-white/2.5 py-1.25 pr-6
            pl-6.5 font-mono text-[11px] text-t2 transition-colors outline-none
            placeholder:text-t5
            focus:border-accent/40
          "
        />
        {q && (
          <button
            type="button"
            aria-label="Clear filter"
            onClick={() => setQ("")}
            className="
              absolute top-1/2 right-1.5 -translate-y-1/2 text-[12px] text-t5
              hover:text-t2
            "
          >
            ×
          </button>
        )}
      </div>
      <div className="mr-scroll flex max-h-60 flex-col">
        {filtered.length === 0 ? (
          <span className="py-1.75 pl-3 font-mono text-[11px] text-t5">
            no matches
          </span>
        ) : (
          <>
            {starred.map(row)}
            {starred.length > 0 && rest.length > 0 && (
              <div
                data-testid="fav-divider"
                className="my-1 border-t border-white/6"
              />
            )}
            {rest.map(row)}
          </>
        )}
      </div>
      {tip && (
        <div
          role="tooltip"
          style={{ left: tip.x, top: tip.y + 6 }}
          className="
            pointer-events-none fixed z-50 max-w-70 rounded-md border
            border-accent/25 bg-ink px-2.5 py-1.5 font-sans text-[12px]
            leading-tight text-t1 shadow-[0_8px_24px_rgba(0,0,0,0.55)]
          "
        >
          {tip.name}
        </div>
      )}
    </div>
  );
}
