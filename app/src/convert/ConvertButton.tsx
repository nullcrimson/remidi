import { useT } from '../locale/localeContext';
import type { Conv } from './useRemapper';
import type { FocusRef } from '../ui/useFocusIntent';
import type { Blocker } from './blocker';
import { Button } from '../ui/Button';
import { FollowTip } from './FollowTip';

/** What Convert offers: why it cannot run, or how many files it converts to which engine. */
export type ConvertState
  = | ({ kind: 'blocked' } & Blocker<string>)
    | { kind: 'ready'; files: number; target: string };

export function ConvertButton({
  ref,
  conv,
  state,
  onConvert,
}: {
  ref?: FocusRef;
  conv: Conv;
  state: ConvertState;
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
  const blocker = state.kind === 'blocked' ? state : null;
  return (
    <FollowTip text={blocker?.reason ?? null}>
      <Button
        ref={ref}
        variant="primary"
        size="lg"
        disabled={blocker !== null}
        reason={blocker?.reason}
        quietReason={blocker?.quiet}
        onClick={onConvert}
      >
        {state.kind === 'ready'
          ? t({ id: 'convert-button-ready', args: { count: state.files, target: state.target } })
          : t({ id: 'convert-button' })}
      </Button>
    </FollowTip>
  );
}
