import { useT } from '../localeContext';
import type { InputHTMLAttributes, KeyboardEvent } from 'react';
import type { FocusRef } from '../hooks/useFocusIntent';
import { IconButton } from './IconButton';
import { TextField } from './TextField';

export function FilterInput({
  value,
  onChange,
  ariaLabel,
  placeholder,
  inputProps = {},
  inputRef,
}: {
  inputRef?: FocusRef;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder: string;
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;
}) {
  const t = useT();
  const { onKeyDown, ...rest } = inputProps;
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
        {...rest}
        ref={inputRef}
        mono
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          onKeyDown?.(e);
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
          <IconButton label={t({ id: 'filter-clear' })} size="sm" tabbable={false} onClick={() => onChange('')}>
            ×
          </IconButton>
        </span>
      )}
    </div>
  );
}
