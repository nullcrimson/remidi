import type { ReactElement, ReactPortal } from 'react';

/** Children that are elements, never bare text: a container that places them beside other nodes takes these, so browser translation has no text node of its to replace. */
export type ElementChildren = ReactElement | ReactPortal | boolean | null | undefined | readonly ElementChildren[];
