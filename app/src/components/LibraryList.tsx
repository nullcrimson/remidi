import type { Engine } from "../lib/midiremap";

export function LibraryList({
  label,
  value,
  engines,
  onChange,
}: {
  label: string;
  value: string;
  engines: Engine[];
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 font-mono text-[10px] tracking-[0.14em] text-t5">
        {label}
      </div>
      <div className="mr-scroll flex max-h-44 flex-col">
        {engines.map((e) => {
          const sel = e.id === value;
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={sel}
              onClick={() => onChange(e.id)}
              className={`
                border-l-2 py-1.75 pl-3 text-left text-[13px] leading-tight
                transition-colors
                ${
                sel
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
          );
        })}
      </div>
    </div>
  );
}
