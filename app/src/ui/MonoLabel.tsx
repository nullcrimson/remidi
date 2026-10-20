import type { ReactNode } from 'react';
import { labelText, type LabelTone } from './styles';

export function MonoLabel({
  children,
  tone = 'faint',
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode;
  tone?: LabelTone;
  /** A span where a div is not allowed, as inside a button. */
  as?: 'div' | 'span';
  className?: string;
}) {
  return (
    <Tag className={`
      ${className}
      ${labelText(tone)}
      font-mono text-caption tracking-[0.14em]
    `}
    >{children}
    </Tag>
  );
}
