import type { ReactNode } from 'react';

export function ProseLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="prose-link"
    >
      {children}
    </a>
  );
}
