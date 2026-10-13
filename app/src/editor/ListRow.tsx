import type { FocusEvent, MouseEvent, ReactNode } from 'react';

interface RowHoverProps {
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: () => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: () => void;
}

export function ListRow({
  selected,
  onSelect,
  className = '',
  hoverProps,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  className?: string;
  hoverProps?: RowHoverProps;
  children: ReactNode;
}) {
  return (
    <div className="flex items-stretch">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        {...hoverProps}
        className={`
          ${className}
          border-l-2 text-left transition-colors
          ${
    selected
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
    </div>
  );
}
