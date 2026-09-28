import { useState, type MouseEvent } from 'react';
import { content, sectionHref, type Link, type Section } from '../content/site';
import { ContentBlocks } from './ContentBlocks';
import { Modal } from './Modal';
import { footerLink } from './styles';

type Item = Link & { section?: Section };

const ITEMS: Item[] = content.footer.flatMap((item) => {
  if (typeof item !== 'string') return [item];
  const section = content.sections.find((s) => s.key === item);
  return section ? [{ label: section.label, href: sectionHref(section), section }] : [];
});

function plainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
}

export function SiteFooter() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <footer className="flex flex-col gap-2 px-1">
      <nav aria-label="Site">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-ui">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                aria-haspopup={item.section ? 'dialog' : undefined}
                onClick={(e) => {
                  if (!item.section || !plainClick(e)) return;
                  e.preventDefault();
                  setOpen(item.section.key);
                }}
                className={footerLink}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <p className="text-label text-t5">{content.trademark}</p>

      {content.sections.map((s) => (
        <Modal
          key={s.key}
          open={open === s.key}
          heading={s.heading}
          onClose={() => setOpen(null)}
        >
          <ContentBlocks blocks={s.blocks} />
        </Modal>
      ))}
    </footer>
  );
}
