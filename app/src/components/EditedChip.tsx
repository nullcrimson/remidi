import type { Message } from '../generated/i18n';
import type { Translate } from '../i18n';
import { useT } from '../localeContext';
import type { PresetMatch } from '../lib/editSummary';
import { tag } from './styles';
import { Tooltip, TooltipBody } from './Tooltip';

export interface EditedState {
  count: number;
  lines: Message[];
  preset: PresetMatch;
  onReview: () => void;
}

function accessibleName(count: number, preset: PresetMatch, t: Translate): string {
  if (preset.kind === 'saved') return t({ id: 'edited-review-saved', args: { count, name: preset.name } });
  if (preset.kind === 'unsaved') return t({ id: 'edited-review-unsaved', args: { count, name: preset.name } });
  return t({ id: 'edited-review', args: { count } });
}

export function EditedChip({ count, lines, preset, onReview }: EditedState) {
  const t = useT();
  return (
    <Tooltip
      content={(
        <TooltipBody title={t({ id: 'edited-differ', args: { count } })}>
          {lines.map((line) => t(line)).map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
          <span className="mt-1 block">{t({ id: 'edited-click' })}</span>
        </TooltipBody>
      )}
    >
      <button
        type="button"
        onClick={onReview}
        aria-label={accessibleName(count, preset, t)}
        className={`
          tap inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1
          transition-colors
          hover:bg-accent/10
          ${tag('gold')}
        `}
      >
        <span aria-hidden="true">✎</span>
        {' '}
        {preset.kind === 'saved' && (
          <>
            <span className="min-w-0 truncate">{preset.name}</span>
            {' · '}
          </>
        )}
        <span className="whitespace-nowrap">
          {t({ id: preset.kind === 'unsaved' ? 'edited-count-unsaved' : 'edited-count', args: { count } })}
        </span>
      </button>
    </Tooltip>
  );
}
