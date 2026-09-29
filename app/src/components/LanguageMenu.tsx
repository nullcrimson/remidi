import { useRef, type MouseEvent } from 'react';
import { LOCALE_CODES, LOCALES, type Locale } from '../generated/i18n';
import { converterPath } from '../lib/documentLocale';
import { plainClick } from '../lib/plainClick';
import { useLocale } from '../localeContext';
import { GlobeIcon } from './GlobeIcon';

/** The header's globe button and its list of languages, each named in its own language. */
export function LanguageMenu() {
  const { translator, switchTo } = useLocale();
  const list = useRef<HTMLUListElement>(null);
  const pick = (e: MouseEvent, locale: Locale) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    list.current?.hidePopover();
    if (locale !== translator.locale) switchTo(locale);
  };
  return (
    <>
      <button
        id="language-trigger"
        type="button"
        popoverTarget="language-menu"
        aria-label={translator.t({ id: 'lang-menu-label' })}
        className="nav-link lang-trigger"
      >
        <GlobeIcon />
        <span className="
          hidden
          sm:inline
        "
        >{translator.locale.toUpperCase()}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      <ul id="language-menu" ref={list} popover="auto" className="lang-menu">
        {LOCALE_CODES.map((l) => (
          <li key={l}>
            <a
              href={converterPath(l)}
              hrefLang={LOCALES[l].langTag}
              lang={LOCALES[l].langTag}
              aria-current={l === translator.locale ? 'true' : undefined}
              className="lang-item"
              onClick={(e) => pick(e, l)}
            >
              {LOCALES[l].nativeName}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
