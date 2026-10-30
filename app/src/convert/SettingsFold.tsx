import type { ReactNode } from 'react';
import { useT } from '../locale/localeContext';
import { channelLabel } from '../core/channel';
import type { ChannelScope, MissingDrums, Unrecognized } from '../core/midiremap';
import { MISSING_LABEL } from '../core/missing';
import { octaveName, type OctaveBase } from '../core/notes';
import { UNRECOGNIZED_LABEL } from '../core/unrecognized';

/**
 * The conversion settings folded under one line that names the value of each, so the
 * defaults stay out of the way and a changed one still shows. `open` is held by the
 * caller, which opens it to take a visitor to one setting.
 */
export function SettingsFold({ open, onToggle, oct, channel, missing, unrecognized, children }: {
  open: boolean;
  onToggle: (open: boolean) => void;
  oct: OctaveBase;
  channel: ChannelScope;
  missing: MissingDrums;
  unrecognized: Unrecognized;
  children: ReactNode;
}) {
  const t = useT();
  const values = [
    { label: t({ id: 'octave-label' }), value: octaveName(oct) },
    { label: t({ id: 'channel-label' }), value: t(channelLabel(channel)) },
    { label: t({ id: 'missing-label' }), value: t(MISSING_LABEL[missing]) },
    { label: t({ id: 'unrecognized-label' }), value: t(UNRECOGNIZED_LABEL[unrecognized]) },
  ];
  return (
    <details
      open={open}
      onToggle={(e) => onToggle(e.currentTarget.open)}
      data-testid="settings-fold"
      className="group/fold border-y border-hairline"
    >
      <summary className="
        flex min-h-11 cursor-pointer list-none flex-wrap items-center
        justify-between gap-x-4 gap-y-2 py-2.5
        [&::-webkit-details-marker]:hidden
      "
      >
        <span className="text-ui font-semibold text-t2">{t({ id: 'settings-heading' })}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          {values.map((v) => (
            <span
              key={v.label}
              className="
                rounded-full border border-white/8 px-2.5 py-0.5 text-label
              "
            >
              <span className="text-t5">{v.label}</span>
              <span>{' '}</span>
              <span className="text-t2">{v.value}</span>
            </span>
          ))}
          <span
            aria-hidden="true"
            className="
              text-t3 transition-transform
              group-open/fold:rotate-180
            "
          >▾
          </span>
        </span>
      </summary>
      <div className="pt-2 pb-4">{children}</div>
    </details>
  );
}
