import { useT } from '../locale/localeContext';
import type { ReactNode } from 'react';
import type { FocusRef } from '../ui/useFocusIntent';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

const MAIN_ID = 'main';

/** The page column with the skip link, the site header, the footer and what comes `after` it. */
export function Page({
  wide = false,
  onSkip,
  after,
  children,
}: {
  wide?: boolean;
  onSkip: () => void;
  after?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div
      className="flex min-h-screen flex-col items-center px-5 pt-[6vh] pb-16"
    >
      <div
        data-testid="page-column"
        className={`
          flex w-200 max-w-full flex-col gap-5
          ${wide
      ? `
        lg:w-240
        xl:w-280
      `
      : ''}
        `}
      >
        <div data-nosnippet>
          <a
            href={`#${MAIN_ID}`}
            onClick={(e) => {
              e.preventDefault();
              onSkip();
            }}
            className="skip-link"
          >
            {t({ id: 'skip-to-content' })}
          </a>
          <SiteHeader />
        </div>
        {children}
        <SiteFooter />
        {after}
      </div>
    </div>
  );
}

/** The converter's card: the page's main landmark. */
export function Card({ mainRef, children }: { mainRef: FocusRef; children: ReactNode }) {
  return (
    <main
      id={MAIN_ID}
      ref={mainRef}
      tabIndex={-1}
      className="
        w-full overflow-clip rounded-card border border-hairline bg-card
        shadow-card outline-none
      "
    >
      {children}
    </main>
  );
}
