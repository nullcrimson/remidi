import tip from '../content/tip.json';
import { LOCALES } from '../generated/i18n';
import { useLocale } from '../localeContext';

/** The ask for a tip once a file is saved: a short note and Stripe links, each in a new tab. */
export function TipCard() {
  const { translator } = useLocale();
  const { t, locale } = translator;
  const euros = new Intl.NumberFormat(LOCALES[locale].langTag, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  return (
    <div
      role="group"
      aria-label={t({ id: 'tip-amounts' })}
      className="tip-card"
    >
      <p className="text-ui/relaxed text-t3">
        <span aria-hidden="true" className="text-star">☕ </span>
        {t({ id: 'tip-ask' })}
      </p>
      <ul className="flex flex-wrap items-center gap-2">
        {tip.amounts.map((a) => (
          <li key={a.href}>
            <a
              href={a.href}
              target="_blank"
              rel="noopener"
              className={'featured' in a && a.featured
                ? `tip-amount tip-amount-featured`
                : `tip-amount`}
            >
              {euros.format(a.euros)}
            </a>
          </li>
        ))}
        <li className="ml-1">
          <a
            href={tip.other}
            target="_blank"
            rel="noopener"
            className="prose-link text-ui"
          >
            {t({ id: 'tip-other' })}
          </a>
        </li>
      </ul>
    </div>
  );
}
