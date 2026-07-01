import type { ReactNode } from 'react';

const VARIANTS = {
  solid: `
    inline-flex items-center gap-1.75 rounded-[9px] bg-accent px-4 py-2 font-display
    text-[13px] font-semibold text-ink
    hover:brightness-110
  `,
  outline: `
    rounded-[11px] border border-accent py-3.5 text-center font-display
    text-[13.5px] font-semibold text-accent transition-colors
    enabled:hover:bg-accent enabled:hover:text-ink
    disabled:opacity-40
  `,
};

export function Button({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: 'solid' | 'outline';
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={VARIANTS[variant]}>
      {children}
    </button>
  );
}
