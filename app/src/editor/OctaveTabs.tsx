import { OCTAVE_INDICES, octaveTabLabel, type OctaveBase } from '../core/notes';
import { chip } from '../ui/styles';

export function OctaveTabs({
  value,
  base,
  onChange,
}: {
  value: number;
  base: OctaveBase;
  onChange: (octIndex: number) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {OCTAVE_INDICES.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={chip(o === value ? 'on' : 'off', 'sm')}
        >
          {octaveTabLabel(o, base)}
        </button>
      ))}
    </div>
  );
}
