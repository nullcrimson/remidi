import { useId, type ReactNode } from 'react';
import { textAction, type TextTone } from './styles';

type Props = { tone?: TextTone; children: ReactNode } & (
  | { href: string; download?: string; onClick?: () => void; disabled?: never; reason?: never }
  | { href?: never; download?: never; onClick: () => void; disabled?: boolean; reason?: string }
);

export function TextButton({ tone, children, ...rest }: Props) {
  const reasonId = useId();
  if (rest.href !== undefined) {
    return (
      <a href={rest.href} download={rest.download} onClick={rest.onClick} className={textAction(tone)}>
        {children}
      </a>
    );
  }
  const disabled = rest.disabled ?? false;
  const explained = disabled && rest.reason !== undefined;
  const button = (
    <button
      type="button"
      onClick={rest.onClick}
      disabled={disabled}
      aria-describedby={explained ? reasonId : undefined}
      className={textAction(tone)}
    >
      {children}
    </button>
  );
  if (!explained) return button;
  return (
    <>
      {button}
      <span id={reasonId} className="w-full text-label text-t5">{rest.reason}</span>
    </>
  );
}
