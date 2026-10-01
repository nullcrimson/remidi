import tip from '../content/tip.json';
import { LOCALES } from '../generated/i18n';
import { useLocale } from '../localeContext';
import { rememberTip } from '../lib/tipAsk';
import { IconButton } from './IconButton';

/**
 * The ask for a tip, pinned to the top of the screen: a short note and Stripe links, each
 * in a new tab. Choosing one is remembered so the ask pauses; `onClose` hides it.
 */
export function TipToast({ onClose }: { onClose: () => void }) {
  const { translator } = useLocale();
  const { t, locale } = translator;
  const euros = new Intl.NumberFormat(LOCALES[locale].langTag, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const tipped = () => {
    rememberTip();
    onClose();
  };

  return (
    <div
      role="group"
      aria-label={t({ id: 'tip-amounts' })}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="tip-toast"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-ui/relaxed text-t3">
          <span aria-hidden="true" className="text-star">☕ </span>
          {t({ id: 'tip-ask' })}
        </p>
        <IconButton label={t({ id: 'close' })} onClick={onClose}>×</IconButton>
      </div>
      <ul className="flex flex-wrap items-center gap-2">
        {tip.amounts.map((a) => (
          <li key={a.href}>
            <a
              href={a.href}
              target="_blank"
              rel="noopener"
              onClick={tipped}
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
            onClick={tipped}
            className="prose-link text-ui"
          >
            {t({ id: 'tip-other' })}
          </a>
        </li>
      </ul>
    </div>
  );
}
