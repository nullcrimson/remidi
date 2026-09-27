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
  onClick,
  children,
}: {
  label: string;
  size?: keyof typeof SIZE;
  tone?: keyof typeof TONE;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`
        flex shrink-0 items-center justify-center leading-none transition-colors
        ${SIZE[size]}
        ${TONE[tone]}
      `}
    >
      {children}
    </button>
  );
}
