import type { ReactNode } from 'react';

const SIZE = {
  sm: 'size-5 rounded-full text-ui text-t5 hover:bg-white/8',
  md: 'size-7 rounded-chip bg-white/5 text-body text-t4 hover:bg-white/10',
};

const TONE = {
  default: 'hover:text-t1',
  danger: 'hover:text-danger',
};

export function IconButton({
  label,
  size = 'md',
  tone = 'default',
  disabled = false,
  tabbable = true,
  onClick,
  children,
}: {
  label: string;
  size?: keyof typeof SIZE;
  tone?: keyof typeof TONE;
  disabled?: boolean;
  tabbable?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      tabIndex={tabbable ? undefined : -1}
      onClick={onClick}
      className={`
        tap flex shrink-0 items-center justify-center leading-none
        transition-colors
        disabled:cursor-default disabled:opacity-40
        ${SIZE[size]}
        ${TONE[tone]}
      `}
    >
      {children}
    </button>
  );
}
