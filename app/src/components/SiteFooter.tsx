import { useState, type MouseEvent } from 'react';
import { href, sectionBlocks, targetLabel } from '../content/site';
import { FOOTER, SECTION_KEYS, SECTION_MESSAGES, type SectionKey } from '../generated/i18n';
import { t } from '../i18n';
import { LOCALE } from '../locale';
import { ContentBlocks } from './ContentBlocks';
import { Modal } from './Modal';

function plainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
}

export function SiteFooter() {
  const [open, setOpen] = useState<SectionKey | null>(null);

  return (
    <footer className="flex flex-col gap-2 px-1">
      <nav aria-label={t({ id: 'nav-site' })}>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-ui">
          {FOOTER.map((target) => {
            const section = 'section' in target ? target.section : null;
            return (
              <li key={href(target, LOCALE)}>
                <a
                  href={href(target, LOCALE)}
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
      <p className="text-center text-label text-t5">{t({ id: 'trademark' })}</p>

      {SECTION_KEYS.map((key) => (
        <Modal
          key={key}
          open={open === key}
          heading={t({ id: SECTION_MESSAGES[key].heading })}
          onClose={() => setOpen(null)}
        >
          <ContentBlocks blocks={sectionBlocks(key, LOCALE)} />
        </Modal>
      ))}
    </footer>
  );
}
