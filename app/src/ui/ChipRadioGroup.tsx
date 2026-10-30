import { Fragment, useId } from 'react';
import { chip } from './styles';

export function ChipRadioGroup<T extends string>({
  labelledBy,
  describedBy,
  options,
  value,
  onChange,
}: {
  labelledBy: string;
  describedBy?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="inline-flex gap-1"
    >
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        return (
          <Fragment key={o.value}>
            <input
              id={id}
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <label
              htmlFor={id}
              className={`
                cursor-pointer outline-offset-2 outline-accent/60
                [input:focus-visible+&]:outline-2
                ${chip(o.value === value ? 'on' : 'off', 'sm')}
              `}
            >
              {o.label}
            </label>
          </Fragment>
        );
      })}
    </div>
  );
}
