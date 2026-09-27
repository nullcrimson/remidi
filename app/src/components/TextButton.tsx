import type { ReactNode } from 'react';
import { textAction, type TextTone } from './styles';

type Props = { tone?: TextTone; children: ReactNode } & (
  | { href: string; download?: string; onClick?: never; disabled?: never }
  | { href?: never; download?: never; onClick: () => void; disabled?: boolean }
);

export function TextButton({ tone, children, ...rest }: Props) {
  if (rest.href !== undefined) {
    return (
      <a href={rest.href} download={rest.download} className={textAction(tone)}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={rest.onClick} disabled={rest.disabled} className={textAction(tone)}>
      {children}
    </button>
  );
}
