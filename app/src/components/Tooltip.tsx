import { cloneElement, useState, type ReactElement, type ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';

export function Tooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactElement<Record<string, unknown>>;
}) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { move: false }),
    useFocus(context),
    useDismiss(context),
    useRole(context, { role: 'tooltip' }),
  ]);

  return (
    <>
      {cloneElement(
        children,
        // eslint-disable-next-line react-hooks/refs -- Floating UI setReference is a callback-ref setter, not a during-render ref read
        getReferenceProps({ ref: refs.setReference, ...children.props }),
      )}
      {open && (
        <FloatingPortal>
          <div
            // eslint-disable-next-line react-hooks/refs -- Floating UI setFloating is a callback-ref setter, not a during-render ref read
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="
              z-50 w-max max-w-64 rounded-[9px] border border-accent/25 bg-ink
              px-3 py-2 text-left text-[11.5px] leading-snug text-t4
              shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)]
            "
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export function TooltipBody({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <span className="font-medium text-t1">{title}</span>
      <span className="mt-1 block text-t4">{children}</span>
    </>
  );
}
