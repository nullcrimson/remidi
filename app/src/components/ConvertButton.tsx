import type { Conv } from '../hooks/useRemapper';
import { CONVERT_BUTTON_ID } from '../lib/focusIds';
import { Button } from './Button';

export function ConvertButton({
  conv,
  blockedBy,
  onConvert,
}: {
  conv: Conv;
  blockedBy: string | null;
  onConvert: () => void;
}) {
  if (conv.kind === 'running') {
    return (
      <div>
        <div className="
          mb-2.25 flex justify-between font-mono text-label text-t4
        "
        >
          <span>remapping</span>
          <span className="text-accent">…</span>
        </div>
        <div className="h-0.5 overflow-hidden bg-white/8">
          <div className="h-full w-1/3 animate-pulse bg-accent" />
        </div>
      </div>
    );
  }
  return (
    <Button
      id={CONVERT_BUTTON_ID}
      variant="primary"
      size="lg"
      disabled={blockedBy !== null}
      reason={blockedBy ?? undefined}
      onClick={onConvert}
    >
      Convert &amp; download
    </Button>
  );
}
