/** How sending a page on went: through the share sheet, copied, closed by the visitor, or neither way worked. */
export type Shared = 'shared' | 'copied' | 'cancelled' | 'failed';

/** The pages that offer to send themselves on, as `page-shared` names them: the converter and the static pages with downloads. */
export const HANDOFF_PAGES = ['converter', 'engine', 'drum-maps', 'pair'] as const;

/** A page that offers to send itself on. */
export type HandoffPage = (typeof HANDOFF_PAGES)[number];

/** How `page-shared` says the page went on: shared, copied, or its address shown to copy by hand. */
export type SharedHow = 'share' | 'copy' | 'shown';

/** The `how` of `page-shared` for each outcome; a cancel sends nothing. */
export const SHARED_HOW = {
  shared: 'share',
  copied: 'copy',
  failed: 'shown',
  cancelled: null,
} as const satisfies Record<Shared, SharedHow | null>;

const closedByTheVisitor = (error: unknown) => error instanceof Error && error.name === 'AbortError';

/**
 * Sends `address` on: through the share sheet where there is one; else, or when it fails for
 * any reason but the visitor closing it, copied; `failed` when the copy fails too, so the
 * caller shows the address to copy by hand.
 */
export async function sharePage(address: string, nav: Pick<Navigator, 'share' | 'clipboard'>): Promise<Shared> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ url: address });
      return 'shared';
    } catch (error) {
      if (closedByTheVisitor(error)) return 'cancelled';
    }
  }
  try {
    await nav.clipboard.writeText(address);
    return 'copied';
  } catch {
    return 'failed';
  }
}
