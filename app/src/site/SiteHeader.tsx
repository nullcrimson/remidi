import { href, targetLabel, targetName } from './site';
import { track } from '../core/stats';
import { LOCALES, NAV } from '../generated/i18n';
import { useLocale } from '../locale/localeContext';
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
          </span>
          <span>{t({ id: 'brand-tagline' })}</span>
        </span>
      </h1>
      <nav aria-label={t({ id: 'nav-main' })}>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-ui">
          {NAV.map((target) => {
            const current = 'route' in target && target.route === 'converter';
            return (
              <li key={href(target, locale)}>
                <a
                  href={href(target, locale)}
                  aria-current={current ? 'page' : undefined}
                  onClick={current ? undefined : () => track('nav-used', { target: targetName(target), where: 'header' })}
                  className="nav-link whitespace-nowrap"
                >
                  {t(targetLabel(target))}
                </a>
              </li>
            );
          })}
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
