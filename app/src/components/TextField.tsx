import type { InputHTMLAttributes } from 'react';
import { field } from './styles';

export function TextField({
  mono = false,
  className = '',
  ...props
}: { mono?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
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
