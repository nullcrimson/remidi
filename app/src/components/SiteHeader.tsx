import { href, targetLabel } from '../content/site';
import { LOCALES, NAV } from '../generated/i18n';
import { useLocale } from '../localeContext';
import { LanguageMenu } from './LanguageMenu';

export function SiteHeader() {
  const { translator: { t, locale }, failed } = useLocale();
  return (
    <header className="
      flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-1
    "
    >
      <h1 className="flex flex-wrap items-baseline gap-x-2">
        <span className="brand-mark">Drumverter</span>
        <span className="text-ui font-normal text-t5">
          <span className="
            hidden
            sm:inline
          "
          >{'— '}
          </span>{t({ id: 'brand-tagline' })}
        </span>
      </h1>
      <nav aria-label={t({ id: 'nav-main' })}>
        <ul className="flex gap-5 text-ui">
          {NAV.map((target) => (
            <li key={href(target, locale)}>
              <a
                href={href(target, locale)}
                aria-current={'route' in target && target.route === 'converter' ? 'page' : undefined}
                className="nav-link"
              >
                {t(targetLabel(target))}
              </a>
            </li>
          ))}
          <li><LanguageMenu /></li>
        </ul>
      </nav>
      {failed && (
        <p role="alert" className="basis-full text-ui text-danger">
          {t({ id: 'lang-load-failed', args: { language: LOCALES[failed].nativeName } })}
        </p>
      )}
    </header>
  );
}
