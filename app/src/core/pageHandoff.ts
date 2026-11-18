import { HANDOFF_PAGES, SHARED_HOW, sharePage, type HandoffPage, type Shared } from './sharePage';
import { send } from './umami';

/** The page a `[data-handoff]` box names; a name `page-shared` does not know is a fault of the page, thrown so it is seen. */
function handoffPage(kind: string | undefined): HandoffPage {
  const page = HANDOFF_PAGES.find((known) => known === kind);
  if (page === undefined) throw new Error(`data-handoff="${kind}" names no page page-shared knows`);
  return page;
}

/**
 * Wires the phone line of each `[data-handoff]` box of a static page: its `[data-share]`
 * button sends this page on, then the `[data-shared]` line of the outcome shows, with the
 * page's address in `[data-address]` where it is to be copied by hand, and the event is counted.
 */
export function runHandoffScript(document: Document, nav: Pick<Navigator, 'share' | 'clipboard'>): void {
  document.querySelectorAll<HTMLElement>('[data-handoff]').forEach((box) => {
    const page = handoffPage(box.dataset.handoff);
    const show = (shared: Shared, address: string) => {
      box.querySelectorAll<HTMLElement>('[data-shared]').forEach((line) => {
        line.hidden = line.dataset.shared !== shared;
      });
      box.querySelectorAll('[data-address]').forEach((field) => {
        field.textContent = address;
      });
    };
    box.querySelector('[data-share]')?.addEventListener('click', () => {
      const address = document.URL;
      void sharePage(address, nav).then((shared) => {
        show(shared, address);
        const how = SHARED_HOW[shared];
        if (how !== null) send('page-shared', { page, how });
      });
    });
  });
}
