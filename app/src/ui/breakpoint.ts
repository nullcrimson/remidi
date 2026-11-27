/** The width from which `sm:` styles apply, as `--breakpoint-sm` in `index.css` sets it: below it the page is laid out for a phone. */
export const SM_WIDTH = '40rem';

/** The media query that holds from `SM_WIDTH` up: false on a phone. */
export const WIDE_QUERY = `(min-width: ${SM_WIDTH})`;

/** Whether the window is narrower than `SM_WIDTH`, so the page is laid out for a phone. */
export const isNarrowScreen = (): boolean => !window.matchMedia(WIDE_QUERY).matches;
