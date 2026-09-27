import type { ReactNode } from 'react';
import { proseLink } from './styles';

export function ProseLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={proseLink}>
      {children}
    </a>
  );
}
