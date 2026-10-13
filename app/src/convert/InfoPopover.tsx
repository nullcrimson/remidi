import { useState, type ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';

/**
 * Text with a dotted underline that opens a panel of detail: on hover, closing a moment
 * after the mouse leaves both, or pinned open by a click, tap or Enter until Esc, a click
 * outside or another click. The panel follows the text in the DOM, so Tab reaches its
 * controls next. It is never taller than the room on its side of the text and scrolls
 * inside, so growing content does not move it to the other side.
 */
export function InfoPopover({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const { refs: { setReference, setFloating }, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next, _event, reason) => {
      if (reason === 'click' && !next && !pinned) {
        setPinned(true);
        return;
      }
      if (!next && pinned && reason === 'hover') return;
      setPinned(next && reason === 'click');
      setOpen(next);
    },
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${availableHeight}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { delay: { open: 100, close: 300 } }),
    useClick(context),
    useDismiss(context),
    useRole(context, { role: 'dialog' }),
  ]);

  return (
    <>
      <button
        ref={setReference}
        type="button"
        {...getReferenceProps()}
        className="
          tap cursor-pointer border-b border-dotted border-t5 text-left
          transition-colors
          hover:border-accent hover:text-t2
          aria-expanded:border-accent aria-expanded:text-t2
        "
      >
        {label}
      </button>
      {open && (
        <div
          ref={setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="
            mr-scroll z-50 flex w-max max-w-72 flex-col gap-3 overflow-y-auto
            rounded-panel border border-accent/25 bg-ink px-3.5 py-3 text-left
            font-sans text-caption/snug text-t3 shadow-popover
          "
        >
          {children}
        </div>
      )}
    </>
  );
}
