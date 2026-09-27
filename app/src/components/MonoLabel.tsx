import type { ReactNode } from 'react';

export function MonoLabel({
  children,
  tone = 'text-t5',
  className = '',
}: {
  children: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={`
      ${className}
      ${tone}
      font-mono text-caption tracking-[0.14em]
    `}
    >{children}
    </div>
  );
}
