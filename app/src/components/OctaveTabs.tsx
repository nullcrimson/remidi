import { octaveTabLabel, type OctaveBase } from '../lib/notes';

const OCT_INDICES = [-1, 0, 1, 2, 3, 4, 5, 6, 7];

export function OctaveTabs({
  value,
  base,
  onChange,
}: {
  value: number;
  base: OctaveBase;
  onChange: (octIndex: number) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {OCT_INDICES.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`
            rounded-md border px-2.75 py-1.25 font-mono text-[11px]
            font-semibold
            ${o === value ? 'border-accent bg-accent/15 text-t1' : `
              border-field-border text-t4
            `}
          `}
        >
          {octaveTabLabel(o, base)}
        </button>
      ))}
    </div>
  );
}
