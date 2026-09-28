export function ChipSelect<T extends string>({
  id,
  labelledBy,
  describedBy,
  options,
  value,
  onChange,
}: {
  id?: string;
  labelledBy: string;
  describedBy?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <span className="relative inline-flex">
      <select
        id={id}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="
          field-sizing-content cursor-pointer appearance-none rounded-chip
          border border-white/12 bg-field py-0.5 pr-6 pl-2 font-mono text-label
          font-semibold text-t1 transition-colors
          hover:border-accent/40
          pointer-coarse:py-3
        "
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-t1">
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute top-1/2 right-2 -translate-y-1/2
          text-caption text-t4
        "
      >
        ▾
      </span>
    </span>
  );
}
