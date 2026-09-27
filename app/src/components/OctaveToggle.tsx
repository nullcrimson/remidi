import { useId } from 'react';
import type { OctaveBase } from '../lib/notes';
import { SettingRow } from './SettingRow';

const OCTAVES: { value: OctaveBase; label: string }[] = [
  { value: 'c1', label: 'C-1' },
  { value: 'c2', label: 'C-2' },
];

const DAWS: Record<OctaveBase, string> = {
  c1: 'Reaper · Logic · Ableton · Guitar Pro',
  c2: 'Studio One · Cubase · FL Studio',
};

export function OctaveToggle({
  value,
  onChange,
}: {
  value: OctaveBase;
  onChange: (base: OctaveBase) => void;
}) {
  const name = useId();
  return (
    <SettingRow
      label="Octaves start at"
      tipTitle="Octave naming only"
      tip="Sets which octave MIDI note 0 sits in, so note names match your DAW. Display label only — the notes written to the file never change."
      hint={DAWS[value]}
    >
      {(labelId) => (
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className="
            relative grid grid-cols-2 rounded-full border border-field-border
            bg-field p-0.5
            has-focus-visible:border-accent/60
          "
        >
          <span
            aria-hidden
            className={`
              absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full
              bg-accent shadow-[0_0_12px_-2px_rgba(199,192,173,0.45)]
              transition-transform duration-200 ease-out
              motion-reduce:transition-none
              ${value === 'c2' ? 'translate-x-full' : 'translate-x-0'}
            `}
          />
          {OCTAVES.map((o) => (
            <label
              key={o.value}
              className={`
                relative z-10 cursor-pointer px-2.5 py-0.5 text-center font-mono
                text-[12px] font-semibold transition-colors duration-200
                ${value === o.value
              ? 'text-ink'
              : `
                text-t4
                hover:text-t1
              `}
              `}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </SettingRow>
  );
}
