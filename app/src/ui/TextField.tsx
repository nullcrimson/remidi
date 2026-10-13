import type { InputHTMLAttributes, Ref } from 'react';

/** Text input; 16px below `sm` so phones do not zoom on focus. */
function field(mono: boolean): string {
  return `
    rounded-chip border border-field-border bg-field px-2 py-1.25 text-body
    text-t2 transition-colors outline-none
    placeholder:text-t5
    focus:border-accent/40
    aria-invalid:border-danger/60
    pointer-coarse:py-2.5
    ${mono ? 'font-mono sm:text-label' : 'sm:text-ui'}
  `;
}

export function TextField({
  mono = false,
  className = '',
  ...props
}: { mono?: boolean; ref?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`
        ${field(mono)}
        ${className}
      `}
    />
  );
}
