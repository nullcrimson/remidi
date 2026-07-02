import type { ReactNode } from 'react';

export function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`
      ${className}
      font-mono text-[10px] tracking-[0.14em] text-t5
    `}
    >{children}
    </div>
  );
}
