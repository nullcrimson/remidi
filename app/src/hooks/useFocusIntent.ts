import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** The controls focus moves to after an action finishes. */
export type FocusTarget = 'main' | 'from' | 'to' | 'convert' | 'editLink' | 'filePicker' | 'channel';

/** A callback ref that registers an element as a focus target. */
export type FocusRef = (el: HTMLElement | null) => void;

/**
 * Moves focus after the render an action causes, so the target may be an element that
 * render creates. `ref(target)` registers the element; `request(target)` focuses it once
 * the change is on screen, after any dialog that closed in the same render has handed
 * focus back to its opener.
 */
export function useFocusIntent() {
  const elements = useRef(new Map<FocusTarget, HTMLElement>());
  const refs = useRef(new Map<FocusTarget, FocusRef>());
  const [intent, setIntent] = useState<{ target: FocusTarget } | null>(null);

  useLayoutEffect(() => {
    if (!intent) return;
    queueMicrotask(() => elements.current.get(intent.target)?.focus());
  }, [intent]);

  const ref = useCallback((target: FocusTarget): FocusRef => {
    const known = refs.current.get(target);
    if (known) return known;
    const register: FocusRef = (el) => {
      if (el) elements.current.set(target, el);
      else if (elements.current.get(target)?.isConnected === false) elements.current.delete(target);
    };
    refs.current.set(target, register);
    return register;
  }, []);
  const request = useCallback((target: FocusTarget) => setIntent({ target }), []);

  return { ref, request };
}
