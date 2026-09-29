import { t } from '../i18n';
import type { FocusRef } from '../hooks/useFocusIntent';
import { EditedChip, type EditedState } from './EditedChip';
import { textAction } from './styles';
import { Tooltip, TooltipBody } from './Tooltip';
import { Rich } from './Rich';

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
          <Rich
            id="summary-remapped"
            args={{ total }}
            slots={{ remapped: <span className="font-semibold text-accent">{remapped}</span> }}
          />
        </span>
        {edited && <EditedChip {...edited} />}
      </div>
      <Tooltip
        content={(
          <TooltipBody title={t({ id: 'summary-edit-tip-title' })}>
            {t({ id: 'summary-edit-tip' })}
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
          {t({ id: 'summary-edit' })}
        </button>
      </Tooltip>
    </div>
  );
}
