export function FilterInput({
  value,
  onChange,
  ariaLabel,
  placeholder = 'filter…',
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder?: string;
}) {
  return (
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
          }
        }}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="
          w-full rounded-md border border-field-border bg-field py-1.25 pr-6
          pl-6.5 font-mono text-[11px] text-t2 transition-colors outline-none
          placeholder:text-t5
          focus:border-accent/40
        "
      />
      {value && (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={() => onChange('')}
          className="
            absolute top-1/2 right-1.5 -translate-y-1/2 text-[12px] text-t5
            hover:text-t2
          "
        >
          ×
        </button>
      )}
    </div>
  );
}
