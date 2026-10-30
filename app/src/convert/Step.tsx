import { useId } from 'react';
import { useT } from '../locale/localeContext';
import { CheckIcon } from '../ui/CheckIcon';
import type { ElementChildren } from '../ui/elementChildren';
import type { StepState } from './stepState';

/** One numbered step of the converter: its heading, a badge that turns into a check once done, and its controls. */
export function Step({ number, title, state, children }: {
  number: number;
  title: string;
  state: StepState;
  children: ElementChildren;
}) {
  const t = useT();
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      data-step={state}
      className="flex flex-col gap-3.5"
    >
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="step-badge" data-state={state}>
          {state === 'done' ? <CheckIcon /> : number}
        </span>
        <h2
          id={headingId}
          className="font-display text-body font-semibold text-t1"
        >
          <span>{title}</span>
          {state === 'done' && <span className="sr-only">{` · ${t({ id: 'step-done' })}`}</span>}
        </h2>
      </div>
      {children}
    </section>
  );
}
