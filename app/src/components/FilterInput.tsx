import { IconButton } from './IconButton';
import { TextField } from './TextField';

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
          text-label text-t5
        "
      >
        ⌕
      </span>
      <TextField
        mono
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
        className="w-full pr-6 pl-6.5"
      />
      {value && (
        <span className="absolute top-1/2 right-1 -translate-y-1/2">
          <IconButton label="Clear filter" size="sm" onClick={() => onChange('')}>×</IconButton>
        </span>
      )}
    </div>
  );
}
