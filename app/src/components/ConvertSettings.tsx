import type { FocusRef } from '../hooks/useFocusIntent';
import type { ChannelScope, MissingDrums } from '../lib/midiremap';
import type { Swap } from '../lib/missing';
import type { OctaveBase } from '../lib/notes';
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
  missingSwaps?: Swap[];
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
      <OctaveToggle value={oct} onChange={onOct} />
      <ChannelSelect ref={channelRef} value={channel} onChange={onChannel} />
      <MissingDrumsSetting
        value={missing}
        hint={missingHint}
        swaps={missingSwaps}
        onOpenEditor={onMissingDetail}
        onChange={onMissing}
      />
    </div>
  );
}
