import type { FocusEvent, MouseEvent, ReactNode } from 'react';

export interface RowHoverProps {
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: () => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: () => void;
}

export function ListRow({
  selected,
  disabled = false,
  onSelect,
  className = '',
  hoverProps,
  trailing,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  className?: string;
  hoverProps?: RowHoverProps;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-stretch">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={onSelect}
        {...hoverProps}
        className={`
          ${className}
          border-l-2 text-left transition-colors
          ${
            disabled
              ? 'cursor-not-allowed border-transparent text-t6 opacity-40'
              : selected
                ? 'border-accent font-semibold text-t1'
                : `
                  border-transparent text-t4
                  hover:text-t1
                `
          }
        `}
      >
        {children}
      </button>
      {trailing}
    </div>
  );
}
