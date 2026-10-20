import { POPULAR } from '../generated/i18n';
import { localePath } from '../locale/locale';
import { useLocale } from '../locale/localeContext';
import { pairPath } from './site';
import type { Engine } from '../core/midiremap';

const HEADING_ID = 'popular-conversions';

const ITEM = `
  inline-flex items-center
  not-last:after:mx-2.5 not-last:after:content-['·']
`;

const SUMMARY = `
  inline-flex cursor-pointer list-none items-center gap-1.5 text-caption font-medium
  tracking-wider text-t4 uppercase transition-colors
  tap
  hover:text-t2
  [&::-webkit-details-marker]:hidden
`;

const LINK = `
  tap transition-colors
  hover:text-t2
`;

/** Links to the popular conversion tables, once the engines are known. */
export function PopularConversions({ engines }: { engines: readonly Engine[] }) {
  const { t, locale } = useLocale().translator;
  const names = new Map<string, string>(engines.map((e) => [e.id, e.name]));
  const links = POPULAR.flatMap(([src, tgt]) => {
    const source = names.get(src);
    const target = names.get(tgt);
    return source === undefined || target === undefined
      ? []
      : [{ href: localePath(locale, pairPath(src, tgt)), source, target }];
  });
  if (links.length === 0) return null;
  return (
    <nav aria-labelledby={HEADING_ID} className="px-1 text-center">
      <details className="group">
        <summary className={SUMMARY}>
          <span id={HEADING_ID}>{t({ id: 'maps-popular' })}</span>
          <span
            aria-hidden
            className="
              transition-transform
              group-open:rotate-90
            "
          >›
          </span>
        </summary>
        <ul className="
          mx-auto mt-2 flex max-w-3xl flex-wrap justify-center gap-y-1
          text-label text-t4
        "
        >
          {links.map((l) => (
            <li key={l.href} className={ITEM}>
              <a href={l.href} className={LINK}>
                {t({ id: 'maps-pair-link', args: { source: l.source, target: l.target } })}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
