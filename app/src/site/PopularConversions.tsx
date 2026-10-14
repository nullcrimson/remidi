import { POPULAR } from '../generated/i18n';
import { localePath } from '../locale/locale';
import { useLocale } from '../locale/localeContext';
import { href, pairPath } from './site';
import type { Engine } from '../core/midiremap';

const HEADING_ID = 'popular-conversions';

const LINK = `
  inline-flex rounded-chip border border-white/12 px-2.5 py-1 text-ui text-t2
  transition-colors
  hover:border-accent/40 hover:text-t1
  pointer-coarse:py-3
`;

/** Links to the popular conversion tables and the note maps, once the engines are known. */
export function PopularConversions({ engines }: { engines: readonly Engine[] }) {
  const { t, locale } = useLocale().translator;
  const names = new Map(engines.map((e) => [e.id, e.name]));
  const links = POPULAR.flatMap(([src, tgt]) => {
    const source = names.get(src);
    const target = names.get(tgt);
    return source === undefined || target === undefined
      ? []
      : [{ href: localePath(locale, pairPath(src, tgt)), source, target }];
  });
  if (links.length === 0) return null;
  return (
    <nav aria-labelledby={HEADING_ID} className="flex flex-col gap-3 px-1">
      <h2
        id={HEADING_ID}
        className="font-display text-title font-semibold text-t1"
      >
        {t({ id: 'maps-popular' })}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className={LINK}>
              {t({ id: 'maps-pair-link', args: { source: l.source, target: l.target } })}
            </a>
          </li>
        ))}
        <li>
          <a href={href({ route: 'noteMaps' }, locale)} className={LINK}>
            {t({ id: 'nav-note-maps' })}
          </a>
        </li>
      </ul>
    </nav>
  );
}
