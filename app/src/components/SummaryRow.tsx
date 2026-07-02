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
      <span className="text-[12px] text-t4">
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
          className="
            inline-flex items-center gap-1.5 text-[12px] text-t4
            transition-colors
            enabled:hover:text-accent
            disabled:cursor-not-allowed disabled:opacity-40
          "
        >
          <span>✎</span>
          <span className="border-b border-dashed border-t5 pb-px">
            Edit individual notes →
          </span>
        </button>
      </Tooltip>
    </div>
  );
}
