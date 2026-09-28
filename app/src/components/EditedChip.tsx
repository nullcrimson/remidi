import type { PresetMatch } from '../lib/editSummary';
import { tag } from './styles';
import { Tooltip, TooltipBody } from './Tooltip';

export interface EditedState {
  count: number;
  lines: string[];
  preset: PresetMatch;
  onReview: () => void;
}

function drums(n: number): string {
  return `${n} drum${n === 1 ? '' : 's'}`;
}

function accessibleName(count: number, preset: PresetMatch): string {
  const base = `${drums(count)} edited — review changes`;
  if (preset.kind === 'saved') return `${base}, from preset ${preset.name}`;
  if (preset.kind === 'unsaved') return `${base}, not saved to ${preset.name}`;
  return base;
}

export function EditedChip({ count, lines, preset, onReview }: EditedState) {
  return (
    <Tooltip
      content={(
        <TooltipBody title={`${drums(count)} ${count === 1 ? 'differs' : 'differ'} from the default mapping`}>
          {lines.map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
          <span className="mt-1 block">Click to review or reset.</span>
        </TooltipBody>
      )}
    >
      <button
        type="button"
        onClick={onReview}
        aria-label={accessibleName(count, preset)}
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
          {`${count} edited${preset.kind === 'unsaved' ? ' · unsaved' : ''}`}
        </span>
      </button>
    </Tooltip>
  );
}
