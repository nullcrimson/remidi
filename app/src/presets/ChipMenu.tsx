import { useId, useRef, useState } from 'react';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from '@floating-ui/react';

/** One action of a chip's menu; `run` is handed the way to put focus back on the menu's button. */
export interface ChipMenuItem {
  label: string;
  title: string | undefined;
  run: (focusButton: () => void) => void;
  disabled: boolean;
  danger: boolean;
}

/** The "more" button of a chip and the menu it opens; Escape gives focus back to the button. */
export function ChipMenu({ label, items, buttonClass }: { label: string; items: ChipMenuItem[]; buttonClass: string }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const moreId = useId();
  const focusButton = () => document.querySelector<HTMLElement>(`[data-more="${moreId}"]`)?.focus();

  const { refs: { setReference, setFloating }, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next, _event, reason) => {
      setOpen(next);
      if (!next && reason === 'escape-key') focusButton();
    },
    placement: 'bottom-end',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context, { role: 'menu' }),
    useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: setActiveIndex,
      loop: true,
    }),
  ]);

  return (
    <>
      <button
        ref={setReference}
        data-more={moreId}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        {...getReferenceProps()}
        className={buttonClass}
      >
        ⋯
      </button>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus={false}>
            <div
              ref={setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="
                z-50 min-w-36 overflow-hidden rounded-panel border
                border-hairline bg-ink p-1 shadow-popover
              "
            >
              {items.map((it, i) => (
                <div key={it.label}>
                  {it.danger && (
                    <div role="separator" className="my-1 h-px bg-hairline" />
                  )}
                  <button
                    ref={(node) => {
                      listRef.current[i] = node;
                    }}
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    title={it.title}
                    {...getItemProps({
                      onClick: () => {
                        if (it.disabled) return;
                        setOpen(false);
                        it.run(focusButton);
                      },
                    })}
                    className={`
                      flex w-full items-center rounded-chip px-2.5 py-1.5
                      text-left text-ui transition-colors
                      disabled:opacity-40
                      pointer-coarse:py-3
                      ${it.danger
                  ? `
                    text-t3
                    hover:bg-danger/10 hover:text-danger
                  `
                  : `
                    text-t3
                    hover:bg-white/5 hover:text-t1
                  `}
                      ${i === activeIndex ? 'bg-white/5 text-t1' : ''}
                    `}
                  >
                    {it.label}
                  </button>
                </div>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
