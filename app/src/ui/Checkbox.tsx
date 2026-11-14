import type { InputHTMLAttributes } from 'react';
import { CheckIcon } from './CheckIcon';

/** A real checkbox drawn as a gold box with the step tick; put it inside its `<label>`. */
export function Checkbox(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>) {
  return (
    <span className="check-box">
      <input {...props} type="checkbox" />
      <CheckIcon size={12} />
    </span>
  );
}
