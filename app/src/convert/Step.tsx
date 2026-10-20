import { useId, type ReactNode } from 'react';
import { useT } from '../locale/localeContext';
import { CheckIcon } from '../ui/CheckIcon';
import type { StepState } from './stepState';

const BADGE: Record<StepState, string> = {
  done: 'bg-accent/16 text-accent',
  current: 'bg-accent text-ink',
  later: 'border border-accent/50 text-accent',
};

/** One numbered step of the converter: its heading, a badge that turns into a check once done, and its controls. */
export function Step({ number, title, state, children }: {
  number: number;
  title: string;
  state: StepState;
  children: ReactNode;
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
        <span
          aria-hidden="true"
          className={`
            flex size-6 shrink-0 items-center justify-center rounded-full
            font-display text-label font-semibold
            ${BADGE[state]}
          `}
        >
          {state === 'done' ? <CheckIcon /> : number}
        </span>
        <h2
          id={headingId}
          className="font-display text-body font-semibold text-t1"
        >
          {title}
          {state === 'done' && <span className="sr-only">{` · ${t({ id: 'step-done' })}`}</span>}
        </h2>
      </div>
      {children}
    </section>
  );
}
