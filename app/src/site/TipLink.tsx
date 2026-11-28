import tip from '../../../content/tip.json';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';
import { useT } from '../locale/localeContext';

const PLACES = {
  footer: { className: 'prose-link tip-link', icon: false },
  header: { className: 'tip-head', icon: true },
} as const satisfies Record<Exclude<StatEvents['tip-answered']['where'], 'toast'>, { className: string; icon: boolean }>;

/**
 * The converter's link to the any-amount tip page, in a new tab, counted as a tip answered
 * from `where`: the footer's words, or the top bar's cup, named and titled by those words.
 */
export function TipLink({ where }: { where: keyof typeof PLACES }) {
  const t = useT();
  const words = t({ id: 'tip-link' });
  const { className, icon } = PLACES[where];
  return (
    <a
      href={tip.other}
      target="_blank"
      rel="noopener"
      aria-label={icon ? words : undefined}
      title={icon ? words : undefined}
      onClick={() => track('tip-answered', { answer: 'other', where, site: 'converter' })}
      className={className}
    >
      {icon ? null : words}
    </a>
  );
}
