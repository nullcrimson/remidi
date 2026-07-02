import type { OctaveBase } from '../lib/notes';
import { Tooltip, TooltipBody } from './Tooltip';

export function OctaveToggle({
  value,
  onToggle,
}: {
  value: OctaveBase;
  onToggle: () => void;
}) {
  const label = value === 'c1' ? 'C-1' : 'C-2';
  const daws =
    value === 'c1'
      ? 'Reaper · Logic · Ableton · Guitar Pro'
      : 'Studio One · Cubase · FL Studio';
  return (
    <div className="flex flex-col gap-1.25">
      <div className="flex items-center gap-2 text-[12.5px] text-t4">
        <span className="whitespace-nowrap">Octaves start at</span>
        <Tooltip
          content={
            <TooltipBody title="Octave naming only">
              Sets which octave MIDI note 0 sits in, so note names match your
              DAW. Display label only — the notes written to the file never
              change.
            </TooltipBody>
          }
        >
          <button
            type="button"
            onClick={onToggle}
            className="
              border-b border-dashed border-t5 pb-px font-mono text-[12.5px]
              font-semibold text-t1
              hover:border-accent hover:text-accent
            "
          >
            {label}
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={onToggle}
          className="
            ml-auto text-[11px] whitespace-nowrap text-t5
            hover:text-accent
          "
        >
          switch ⇄
        </button>
      </div>
      <span className="font-mono text-[11.5px] text-monodim">{daws}</span>
    </div>
  );
}
