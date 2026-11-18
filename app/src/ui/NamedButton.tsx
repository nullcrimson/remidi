import { useRef } from 'react';
import { Button } from '../ui/Button';
import { useTruncationTooltip } from '../ui/useTruncationTooltip';

/**
 * A button whose words name an engine: on a phone it fills the width and its words wrap; on a
 * wider screen long words are cut, and the whole of them shows on hover or focus.
 */
export function NamedButton({ variant, text, describedBy, onClick }: {
  variant: 'primary' | 'secondary';
  text: string;
  describedBy?: string;
  onClick: () => void;
}) {
  const { show, hide, tooltip } = useTruncationTooltip();
  const label = useRef<HTMLSpanElement>(null);
  const reveal = () => {
    if (label.current) show(label.current, text);
  };
  return (
    <span
      className="
        flex w-full
        sm:w-auto sm:min-w-0
      "
      onMouseEnter={reveal}
      onMouseLeave={hide}
      onFocus={reveal}
      onBlur={hide}
    >
      <Button variant={variant} size="stack" describedBy={describedBy} onClick={onClick}>
        <span ref={label} className="sm:max-w-64 sm:truncate">{text}</span>
      </Button>
      {tooltip}
    </span>
  );
}
