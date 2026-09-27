import { textAction } from './styles';
import { Tooltip, TooltipBody } from './Tooltip';

export function SummaryRow({
  remapped,
  total,
  onEdit,
  disabled,
}: {
  remapped: number;
  total: number;
  onEdit: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="
      flex items-center justify-between border-t border-hairline pt-4.5
    "
    >
      <span className="text-ui text-t4">
        <span className="font-semibold text-accent">{remapped}</span> of {total}{' '}
        drums remapped
      </span>
      <Tooltip
        content={(
          <TooltipBody title="Fine-tune each drum">
            Reassign any drum to a different target note — pick from the drum list or the piano. Your
            changes apply to the conversion and can be saved as a preset.
          </TooltipBody>
        )}
      >
        <button
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
