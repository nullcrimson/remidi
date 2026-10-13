import type { EnginePair } from '../core/enginePair';
import type { Message } from '../generated/i18n';

/** Why Convert is unavailable. */
export interface Blocker<R = Message> {
  reason: R;
  /** Said only beside the mouse and to screen readers, not under the button: the empty file row already asks for it. */
  quiet: boolean;
}

/** What keeps Convert from running, or `null` when it can run. */
export function convertBlocker({ files, pair }: { files: number; pair: EnginePair | null }): Blocker | null {
  if (files === 0 && pair === null) return { reason: { id: 'blocker-files-and-engines' }, quiet: false };
  if (files === 0) return { reason: { id: 'blocker-files' }, quiet: true };
  if (pair === null) return { reason: { id: 'blocker-engines' }, quiet: false };
  return null;
}
