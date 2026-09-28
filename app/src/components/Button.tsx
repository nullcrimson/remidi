import { useId, type ReactNode } from 'react';
import type { FocusRef } from '../hooks/useFocusIntent';

const VARIANT = {
  primary: 'bg-accent text-ink enabled:hover:brightness-110 [&[href]]:hover:brightness-110',
  secondary: `
    border border-accent/40 text-accent
    enabled:hover:border-accent enabled:hover:bg-accent/8
  `,
};

const SIZE = {
  sm: 'rounded-chip px-3 py-1.5',
  md: 'rounded-panel px-4 py-2',
  lg: 'w-full rounded-panel py-3.5',
};

type Props = {
  ref?: FocusRef;
  variant: keyof typeof VARIANT;
  size: keyof typeof SIZE;
  children: ReactNode;
} & (
  | { href: string; download?: string; onClick?: never; disabled?: never; reason?: never }
  | { href?: never; download?: never; onClick: () => void; disabled?: boolean; reason?: string }
);

export function Button({ ref, variant, size, children, ...rest }: Props) {
  const reasonId = useId();
  const className = `
    inline-flex items-center justify-center gap-1.75 font-display text-ui
    font-semibold transition
    disabled:cursor-not-allowed disabled:opacity-40
    pointer-coarse:min-h-11
    ${VARIANT[variant]}
    ${SIZE[size]}
  `;
  if (rest.href !== undefined) {
    return (
      <a ref={ref} href={rest.href} download={rest.download} className={className}>
        {children}
      </a>
    );
  }
  const disabled = rest.disabled ?? false;
  const explained = disabled && rest.reason !== undefined;
  const button = (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-describedby={explained ? reasonId : undefined}
      onClick={rest.onClick}
      className={className}
    >
      {children}
    </button>
  );
  if (!explained) return button;
  return (
    <div className="flex flex-col items-center gap-2">
      {button}
      <p id={reasonId} className="text-caption text-t4">{rest.reason}</p>
    </div>
  );
}
