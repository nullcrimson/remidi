import type { ReactNode } from 'react';

const SIZE = {
  sm: 'size-5 rounded-full text-ui text-t5 hover:bg-white/8',
  md: 'icon-button-md',
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
        icon-button
        ${SIZE[size]}
        ${TONE[tone]}
      `}
    >
      {children}
    </button>
  );
}
