import { useId, type ReactNode } from 'react';

const VARIANT = {
  primary: 'bg-accent text-ink enabled:hover:brightness-110',
  secondary: 'border border-accent/40 text-accent enabled:hover:border-accent enabled:hover:bg-accent/8',
};

const SIZE = {
  sm: 'rounded-chip px-3 py-1.5',
  md: 'rounded-panel px-4 py-2',
  lg: 'w-full rounded-panel py-3.5',
};

export function Button({
  variant,
  size,
  disabled = false,
  reason,
  onClick,
  children,
}: {
  variant: keyof typeof VARIANT;
  size: keyof typeof SIZE;
  disabled?: boolean;
  reason?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const reasonId = useId();
  const explained = disabled && reason !== undefined;
  const button = (
    <button
      type="button"
      disabled={disabled}
      aria-describedby={explained ? reasonId : undefined}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-1.75 font-display text-ui
        font-semibold transition
        disabled:cursor-not-allowed disabled:opacity-40
        ${VARIANT[variant]}
        ${SIZE[size]}
      `}
    >
      {children}
    </button>
  );
  if (!explained) return button;
  return (
    <div className="flex flex-col items-center gap-2">
      {button}
      <p id={reasonId} className="text-caption text-t4">{reason}</p>
    </div>
  );
}
