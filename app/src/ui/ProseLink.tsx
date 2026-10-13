import type { ReactNode } from 'react';

export function ProseLink({ href, onClick, children }: { href: string; onClick?: () => void; children: ReactNode }) {
  return (
    <a
      href={href}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      className="prose-link"
    >
      {children}
    </a>
  );
}
