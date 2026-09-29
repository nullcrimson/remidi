import { useT } from '../localeContext';
export function MidBadge() {
  const t = useT();
  return <span className="font-mono text-label font-semibold text-accent">{t({ id: 'mid-badge' })}</span>;
}
