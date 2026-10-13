import type { ReactNode } from 'react';
import { labelText, type LabelTone } from './styles';

export function MonoLabel({
  children,
  tone = 'faint',
  className = '',
}: {
  children: ReactNode;
  tone?: LabelTone;
  className?: string;
}) {
  return (
    <div className={`
      ${className}
      ${labelText(tone)}
      font-mono text-caption tracking-[0.14em]
    `}
    >{children}
    </div>
  );
}
