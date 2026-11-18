import type { ReactNode } from 'react';
import type { FocusRef } from '../ui/useFocusIntent';

/** A button that opens the file step's one file input through `onPick`. */
export function FilePicker({
  onPick,
  children,
  fullWidth = true,
  ref,
}: {
  ref?: FocusRef;
  onPick: () => void;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <button
      ref={ref}
      type="button"
      className={`
        cursor-pointer text-left
        ${fullWidth ? 'w-full' : 'tap'}
      `}
      onClick={onPick}
    >
      {children}
    </button>
  );
}
