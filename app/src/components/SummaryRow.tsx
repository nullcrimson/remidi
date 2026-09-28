import type { FocusRef } from '../hooks/useFocusIntent';
import { EditedChip, type EditedState } from './EditedChip';
import { textAction } from './styles';
import { Tooltip, TooltipBody } from './Tooltip';

export function SummaryRow({
  remapped,
  total,
  onEdit,
  editRef,
  disabled,
  edited,
}: {
  remapped: number;
  total: number;
  onEdit: () => void;
  editRef?: FocusRef;
  disabled?: boolean;
  edited?: EditedState;
}) {
  return (
    <div className="
      flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t
      border-hairline pt-4.5
    "
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-ui text-t4">
          <span className="font-semibold text-accent">{remapped}</span> of {total}{' '}
          drums remapped
        </span>
        {edited && <EditedChip {...edited} />}
      </div>
      <Tooltip
        content={(
          <TooltipBody title="Fine-tune each drum">
            Reassign any drum to a different target note — pick from the drum list or the piano. Your
            changes apply to the conversion and can be saved as a preset.
          </TooltipBody>
        )}
      >
        <button
          ref={editRef}
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className={`
            whitespace-nowrap
            ${textAction()}
          `}
        >
          <span aria-hidden="true">✎</span>
          Edit individual notes →
        </button>
      </Tooltip>
    </div>
  );
}
