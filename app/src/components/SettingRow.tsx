import { useId, type ReactElement, type ReactNode } from 'react';
import { Tooltip, TooltipBody } from './Tooltip';

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
  children: (labelId: string) => ReactElement<Record<string, unknown>>;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1.25">
      <div className="flex min-h-7 items-center gap-2 text-[12.5px] text-t4">
        <span id={labelId} className="whitespace-nowrap">{label}</span>
        <Tooltip content={<TooltipBody title={tipTitle}>{tip}</TooltipBody>}>
          {children(labelId)}
        </Tooltip>
      </div>
      <span className="font-mono text-[11.5px] text-monodim">{hint}</span>
    </div>
  );
}
