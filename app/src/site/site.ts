import { localePath } from '../locale/locale';
import { ROUTE_PATHS, SECTION_KEYS, SECTION_MESSAGES, SECTION_SLUGS, TRANSLATED_SECTIONS, type Locale, type Message, type NavTarget, type SitePath } from '../generated/i18n';

/** Where a nav or footer link goes from a `locale` page; missing sections link to English. */
export function href(target: NavTarget, locale: Locale = 'en'): SitePath {
  if ('route' in target) return localePath(locale, ROUTE_PATHS[target.route]);
  const slug = SECTION_SLUGS[target.section];
  return TRANSLATED_SECTIONS[locale].includes(target.section) ? localePath(locale, `/${slug}/`) : `/${slug}/`;
}

/** The English address of the conversion table from engine `src` to engine `tgt`. */
export function pairPath(src: string, tgt: string): SitePath {
  const slug = (id: string) => id.replace(/_/g, '-');
  return `/convert/${slug(src)}-to-${slug(tgt)}/`;
}

/** A document's internal link, pointed at the same page in `locale`. */
export function localHref(path: SitePath, locale: Locale): SitePath {
  const section = SECTION_KEYS.find((k) => path === `/${SECTION_SLUGS[k]}/`);
  if (section !== undefined) return href({ section }, locale);
  return localePath(locale, path);
}

/** The name a navigation target has in `content/structure.json`: its route or its section. */
export function targetName(target: NavTarget) {
  return 'route' in target ? target.route : target.section;
}

export function targetLabel(target: NavTarget): Message {
  if ('route' in target) return { id: target.route === 'converter' ? 'nav-converter' : 'nav-note-maps' };
  return { id: SECTION_MESSAGES[target.section].label };
}
