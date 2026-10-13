import type { FocusRef } from '../ui/useFocusIntent';
import type { ChannelScope, MissingDrums } from '../core/midiremap';
import { track } from '../core/stats';
import type { PlayedOn } from '../core/outcome';
import type { OctaveBase } from '../core/notes';
import { ChannelSelect } from './ChannelSelect';
import { MissingDrumsSetting } from './MissingDrumsSetting';
import { OctaveToggle } from './OctaveToggle';

/** The octave convention, drum channel and missing-drums settings, side by side. */
export function ConvertSettings({
  oct,
  onOct,
  channel,
  onChannel,
  channelRef,
  missing,
  missingHint,
  missingSwaps,
  onMissingDetail,
  onMissing,
}: {
  oct: OctaveBase;
  onOct: (oct: OctaveBase) => void;
  channel: ChannelScope;
  onChannel: (channel: ChannelScope) => void;
  channelRef: FocusRef;
  missing: MissingDrums;
  missingHint: string;
  missingSwaps?: PlayedOn[];
  onMissingDetail?: () => void;
  onMissing: (missing: MissingDrums) => void;
}) {
  return (
    <div className="
      grid grid-cols-1 gap-5.5
      sm:grid-cols-2
      lg:grid-cols-3
    "
    >
      <OctaveToggle
        value={oct}
        onChange={(value) => {
          track('setting-changed', { setting: 'octave', value });
          onOct(value);
        }}
      />
      <ChannelSelect
        ref={channelRef}
        value={channel}
        onChange={(value) => {
          track('setting-changed', { setting: 'channel', value: value === 'auto' || value === 'all' ? value : 'one' });
          onChannel(value);
        }}
      />
      <MissingDrumsSetting
        value={missing}
        hint={missingHint}
        swaps={missingSwaps}
        onOpenEditor={onMissingDetail}
        onChange={(value) => {
          track('setting-changed', { setting: 'missing', value });
          onMissing(value);
        }}
      />
    </div>
  );
}
