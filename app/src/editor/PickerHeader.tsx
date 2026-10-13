import type { ReactNode } from 'react';
import { useT } from '../locale/localeContext';
import { IconButton } from '../ui/IconButton';
import { MonoLabel } from '../ui/MonoLabel';

/** A picker's title line: the heading, what follows it on the baseline if anything, and the close button. */
export function PickerHeader({
  heading,
  onClose,
  className = '',
  children,
}: {
  heading: string;
  onClose: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const t = useT();
  const title = <MonoLabel tone="muted">{heading}</MonoLabel>;
  return (
    <div className={`${className} flex items-center justify-between`.trim()}>
      {children === undefined
        ? title
        : (
            <div className="flex items-baseline gap-2.25">
              {title}
              {children}
            </div>
          )}
      <IconButton label={t({ id: 'close' })} onClick={onClose}>×</IconButton>
    </div>
  );
}
