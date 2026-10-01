import { useT } from '../localeContext';
import type { FocusRef } from '../hooks/useFocusIntent';
import type { EditFilter } from '../lib/editFilter';
import type { PlanBreakdown } from '../lib/planBreakdown';
import { EditedChip, type EditedState } from './EditedChip';
import { InfoPopover } from './InfoPopover';
import { textAction } from './styles';
import { TextButton } from './TextButton';
import { Tooltip, TooltipBody } from './Tooltip';
import { Rich } from './Rich';

/** The display names of the source and target engines. */
export interface EngineNames {
  source: string;
  target: string;
}

export function SummaryRow({
  remapped,
  total,
  onEdit,
  editRef,
  disabled,
  edited,
  breakdown,
  names,
}: {
  remapped: number;
  total: number;
  onEdit: (show?: EditFilter) => void;
  editRef?: FocusRef;
  disabled?: boolean;
  edited?: EditedState;
  breakdown?: PlanBreakdown;
  names?: EngineNames;
}) {
  const t = useT();
  const summary = (
    <Rich
      id="summary-remapped"
      args={{ total }}
      slots={{ remapped: <span className="font-semibold text-accent">{remapped}</span> }}
    />
  );
  return (
    <div className="
      flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t
      border-hairline pt-4.5
    "
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-ui text-t4">
          {breakdown && names
            ? (
                <InfoPopover label={summary}>
                  <BreakdownDetail total={total} breakdown={breakdown} names={names} onEdit={onEdit} />
                </InfoPopover>
              )
            : summary}
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
          onClick={() => onEdit()}
          disabled={disabled}
          className={`
            whitespace-nowrap
            ${textAction('link')}
          `}
        >
          <span aria-hidden="true">✎</span>
          {t({ id: 'summary-edit' })}
        </button>
      </Tooltip>
    </div>
  );
}

function BreakdownDetail({
  total,
  breakdown: { moved, same, variant, swapped, dropped, unplayed },
  names,
  onEdit,
}: {
  total: number;
  breakdown: PlanBreakdown;
  names: EngineNames;
  onEdit: (show: EditFilter) => void;
}) {
  const t = useT();
  const groups = [
    { count: moved, label: t({ id: 'summary-detail-moved' }), reason: '', names: [] },
    { count: same, label: t({ id: 'summary-detail-same' }), reason: t({ id: 'summary-reason-same' }), names: [] },
    {
      count: variant.length,
      label: t({ id: 'summary-detail-variant' }),
      reason: t({ id: 'summary-reason-variant', args: { target: names.target } }),
      names: variant.map((s) => `${s.drum} → ${s.now}`),
    },
    {
      count: swapped.length,
      label: t({ id: 'summary-detail-swapped' }),
      reason: t({ id: 'summary-reason-swapped', args: { target: names.target } }),
      names: swapped.map((s) => `${s.drum} → ${s.now}`),
    },
    {
      count: dropped.length,
      label: t({ id: 'summary-detail-dropped' }),
      reason: t({ id: 'summary-reason-dropped', args: { target: names.target } }),
      names: dropped,
    },
    {
      count: unplayed,
      label: t({ id: 'summary-detail-unplayed' }),
      reason: t({ id: 'summary-reason-unplayed', args: { source: names.source } }),
      names: [],
    },
  ].filter((g) => g.count > 0);
  const issues = variant.length + swapped.length + dropped.length > 0;
  return (
    <>
      <p className="font-semibold text-t1">{t({ id: 'summary-detail-heading', args: { total } })}</p>
      <ul className="flex flex-col gap-1">
        {groups.map((g) => (
          <li key={g.label} className="grid grid-cols-[3ch_1fr] gap-x-2">
            <span className="text-right font-mono text-accent">{g.count}</span>
            <span className="text-t2">{g.label}</span>
            {g.reason && <span className="col-start-2 text-t5">{g.reason}</span>}
            {g.names.map((name) => (
              <span key={name} className="col-start-2 block text-t4">{name}</span>
            ))}
          </li>
        ))}
      </ul>
      <TextButton tone="link" onClick={() => onEdit(issues ? 'issues' : 'all')}>{t({ id: 'detail-edit' })}</TextButton>
    </>
  );
}
