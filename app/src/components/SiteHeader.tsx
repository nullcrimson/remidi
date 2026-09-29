import { href, targetLabel } from '../content/site';
import { NAV } from '../generated/i18n';
import { t } from '../i18n';
import { LOCALE } from '../locale';

export function SiteHeader() {
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
            <li key={href(target, LOCALE)}>
              <a
                href={href(target, LOCALE)}
                aria-current={'route' in target && target.route === 'converter' ? 'page' : undefined}
                className="nav-link"
              >
                {t(targetLabel(target))}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
