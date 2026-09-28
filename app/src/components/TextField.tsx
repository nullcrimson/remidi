import type { InputHTMLAttributes, Ref } from 'react';
import { field } from './styles';

export function TextField({
  mono = false,
  className = '',
  ...props
}: { mono?: boolean; ref?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`
        ${field(mono)}
        ${className}
      `}
    />
  );
}
