import { useState } from 'react';
import { href, sectionBlocks, targetLabel } from '../content/site';
import { FOOTER, SECTION_KEYS, SECTION_MESSAGES, type SectionKey } from '../generated/i18n';
import { useLocale } from '../localeContext';
import { plainClick } from '../lib/plainClick';
import { ContentBlocks } from './ContentBlocks';
import { Modal } from './Modal';

export function SiteFooter() {
  const { translator } = useLocale();
  const { t, locale } = translator;
  const [open, setOpen] = useState<SectionKey | null>(null);

  return (
    <footer className="flex flex-col gap-2 px-1">
      <nav aria-label={t({ id: 'nav-site' })}>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-ui">
          {FOOTER.map((target) => {
            const section = 'section' in target ? target.section : null;
            return (
              <li key={href(target, locale)}>
                <a
                  href={href(target, locale)}
                  aria-haspopup={section ? 'dialog' : undefined}
                  onClick={(e) => {
                    if (!section || !plainClick(e)) return;
                    e.preventDefault();
                    setOpen(section);
                  }}
                  className="prose-link"
                >
                  {t(targetLabel(target))}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {SECTION_KEYS.map((key) => (
        <Modal
          key={key}
          open={open === key}
          heading={t({ id: SECTION_MESSAGES[key].heading })}
          onClose={() => setOpen(null)}
        >
          <ContentBlocks blocks={sectionBlocks(key, translator)} />
        </Modal>
      ))}
    </footer>
  );
}
