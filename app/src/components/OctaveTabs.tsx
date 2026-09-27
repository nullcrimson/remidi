import { octaveTabLabel, type OctaveBase } from '../lib/notes';
import { chip } from './styles';

const OCT_INDICES = [-1, 0, 1, 2, 3, 4, 5, 6, 7];

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
      {OCT_INDICES.map((o) => (
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
