import tip from '../../../content/tip.json';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';
import { useT } from '../locale/localeContext';

/** The converter's link to the any-amount tip page, in a new tab, counted as a tip answered from `where`. */
export function TipLink({ where, className }: { where: Exclude<StatEvents['tip-answered']['where'], 'toast'>; className: string }) {
  const t = useT();
  return (
    <a
      href={tip.other}
      target="_blank"
      rel="noopener"
      onClick={() => track('tip-answered', { answer: 'other', where, site: 'converter' })}
      className={className}
    >
      {t({ id: 'tip-link' })}
    </a>
  );
}
