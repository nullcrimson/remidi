import { useT } from '../localeContext';
import type { Conv } from '../hooks/useRemapper';
import type { FocusRef } from '../hooks/useFocusIntent';
import type { Blocker } from '../lib/blocker';
import { Button } from './Button';
import { FollowTip } from './FollowTip';

export function ConvertButton({
  ref,
  conv,
  blockedBy,
  onConvert,
}: {
  ref?: FocusRef;
  conv: Conv;
  blockedBy: Blocker<string> | null;
  onConvert: () => void;
}) {
  const t = useT();
  if (conv.kind === 'running') {
    return (
      <div>
        <div className="
          mb-2.25 flex justify-between font-mono text-label text-t4
        "
        >
          <span>{t({ id: 'convert-running' })}</span>
          <span className="text-accent">…</span>
        </div>
        <div className="h-0.5 overflow-hidden bg-white/8">
          <div className="h-full w-1/3 animate-pulse bg-accent" />
        </div>
      </div>
    );
  }
  return (
    <FollowTip text={blockedBy?.reason ?? null}>
      <Button
        ref={ref}
        variant="primary"
        size="lg"
        disabled={blockedBy !== null}
        reason={blockedBy?.reason}
        quietReason={blockedBy?.quiet}
        onClick={onConvert}
      >
        {t({ id: 'convert-button' })}
      </Button>
    </FollowTip>
  );
}
