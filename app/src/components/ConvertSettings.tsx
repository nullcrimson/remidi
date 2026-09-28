import type { FocusRef } from '../hooks/useFocusIntent';
import type { Channel } from '../lib/channel';
import type { Missing } from '../lib/missing';
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
  onMissing,
}: {
  oct: OctaveBase;
  onOct: (oct: OctaveBase) => void;
  channel: Channel;
  onChannel: (channel: Channel) => void;
  channelRef: FocusRef;
  missing: Missing;
  missingHint: string;
  onMissing: (missing: Missing) => void;
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
      <MissingDrumsSetting value={missing} hint={missingHint} onChange={onMissing} />
    </div>
  );
}
