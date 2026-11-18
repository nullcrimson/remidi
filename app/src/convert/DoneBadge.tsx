import { useT } from '../locale/localeContext';
import { CheckIcon } from '../ui/CheckIcon';
import { WarnIcon } from '../ui/WarnIcon';

const BADGE_ICON_SIZE = 22;

const BADGE = {
  accent: { className: 'bg-accent/16 text-accent', Icon: CheckIcon },
  danger: { className: 'bg-danger/16 text-danger', Icon: WarnIcon },
};

/** The tone of the done card: accent for a run that converted, danger for one that lost much or converted nothing. */
export type DoneTone = keyof typeof BADGE;

/** The round mark atop the done card, named for what it shows: a check in the accent tone, or a warning in the danger tone. */
export function DoneBadge({ tone }: { tone: DoneTone }) {
  const t = useT();
  const { className, Icon } = BADGE[tone];
  return (
    <span
      role="img"
      aria-label={t({ id: 'done-badge', args: { tone } })}
      className={`
        flex size-12 items-center justify-center rounded-full
        ${className}
      `}
    >
      <Icon size={BADGE_ICON_SIZE} />
    </span>
  );
}
