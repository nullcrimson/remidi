import { useId, type ReactElement, type ReactNode } from 'react';
import { Tooltip, TooltipBody } from './Tooltip';

export interface SettingIds {
  labelledBy: string;
  describedBy: string;
}

export function SettingRow({
  label,
  tipTitle,
  tip,
  hint,
  children,
}: {
  label: string;
  tipTitle: string;
  tip: ReactNode;
  hint: string;
  children: (ids: SettingIds) => ReactElement;
}) {
  const labelId = useId();
  const hintId = useId();
  const tipId = useId();
  return (
    <div className="flex flex-col gap-1.25">
      <div className="flex min-h-7 items-center gap-2 text-label text-t4">
        <Tooltip content={<TooltipBody title={tipTitle}>{tip}</TooltipBody>}>
          <span
            id={labelId}
            className="
              cursor-help border-b border-dotted border-t5 whitespace-nowrap
            "
          >
            {label}
          </span>
        </Tooltip>
        {children({ labelledBy: labelId, describedBy: `${hintId} ${tipId}` })}
        <span id={tipId} className="sr-only">{tip}</span>
      </div>
      <span id={hintId} className="font-mono text-caption text-monodim">{hint}</span>
    </div>
  );
}
