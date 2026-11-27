/** The width from which `sm:` styles apply, as `--breakpoint-sm` in `index.css` sets it: below it the page is laid out for a phone. */
export const SM_WIDTH = '40rem';

/** The media query that holds from `SM_WIDTH` up: false on a phone. */
export const WIDE_QUERY = `(min-width: ${SM_WIDTH})`;
