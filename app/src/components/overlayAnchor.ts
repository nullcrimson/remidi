import { createContext } from 'react';

/** The element a picker belongs to: a press inside it does not close the picker. */
export const OverlayAnchor = createContext<Element | null>(null);
