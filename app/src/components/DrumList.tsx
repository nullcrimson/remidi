import type { Drum } from '../lib/midiremap';
import { noteName, type OctaveBase } from '../lib/notes';
import { useTruncationTooltip } from '../hooks/useTruncationTooltip';
import { ListRow } from './ListRow';
import { MonoLabel } from './MonoLabel';

const FAMILY_ORDER = ['Kick', 'Snare', 'Toms', 'Hi-Hat', 'Cymbals', 'Percussion', 'Aux'];

export function DrumList({
  drums,
  currentNote,
  base,
  onPickNote,
}: {
  drums: Drum[];
  currentNote: number;
  base: OctaveBase;
  onPickNote: (note: number) => void;
}) {
  const { show, hide, tooltip } = useTruncationTooltip();
  const groups = FAMILY_ORDER.map((family) => ({
    family,
    items: drums.filter((d) => d.family === family),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mr-scroll flex max-h-64 flex-col gap-2 pr-1">
      {groups.map((g) => (
        <div key={g.family}>
          <MonoLabel className="mb-1">{g.family}</MonoLabel>
          {g.items.map((d) => (
            <ListRow
              key={d.canon}
              selected={d.note === currentNote}
              onSelect={() => onPickNote(d.note)}
              className="
                flex w-full items-center justify-between py-1 pr-2 pl-2.5
                text-[12px] leading-tight
              "
              hoverProps={{
                onMouseEnter: (e) => show(e.currentTarget.querySelector('span') ?? e.currentTarget, d.label),
                onMouseLeave: hide,
                onFocus: (e) => show(e.currentTarget.querySelector('span') ?? e.currentTarget, d.label),
                onBlur: hide,
              }}
            >
              <span className="min-w-0 truncate">{d.label}</span>
              <span className="ml-2 shrink-0 font-mono text-[11px] text-t5">
                {noteName(d.note, base)}
              </span>
            </ListRow>
          ))}
        </div>
      ))}
      {tooltip}
    </div>
  );
}
