import { useFloating, useInteractions, useDismiss } from '@floating-ui/react';
import { useCallback, useRef, useState } from 'react';

/**
 * What an open dialog needs from Floating UI, as two groups to spread: `focus` on
 * `FloatingFocusManager` (it takes focus when the dialog opens and gives it back to the
 * element that had it) and `panel` on the dialog's element. `onClose` runs on Escape and on
 * a press outside, which `outsidePressEvent` picks the event of and `outsidePress` may veto;
 * `reference` is the element the dialog belongs to, a press inside which does not close it.
 */
export function useDialog({
  onClose,
  reference,
  outsidePressEvent,
  outsidePress,
}: {
  onClose: () => void;
  reference?: Element | null;
  outsidePressEvent: 'click' | 'mousedown';
  outsidePress?: (event: MouseEvent) => boolean;
}) {
  const [opener] = useState(() => ({ current: document.activeElement as HTMLElement | null }));
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const attachPanel = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    setPanel(el);
  }, []);
  const { context } = useFloating({
    open: true,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    elements: { reference, floating: panel },
  });
  const { getFloatingProps } = useInteractions([useDismiss(context, { outsidePressEvent, outsidePress })]);
  return {
    focus: { context, initialFocus: panelRef, returnFocus: opener },
    panel: { ref: attachPanel, role: 'dialog', tabIndex: -1, ...getFloatingProps() },
  };
}
