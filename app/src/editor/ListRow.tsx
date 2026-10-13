import type { FocusEvent, MouseEvent, ReactNode } from 'react';
import { rowState } from '../ui/styles';

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
          text-left
          ${rowState(selected ? 'selected' : 'idle')}
        `}
      >
        {children}
      </button>
    </div>
  );
}
