import type { EnginePair } from '../core/enginePair';
import type { Message } from '../generated/i18n';

/** Why Convert is unavailable. */
export interface Blocker<R = Message> {
  reason: R;
  /** Said only beside the mouse and to screen readers, not under the button: the empty file row already asks for it. */
  quiet: boolean;
}

/** Whether Convert can run: what keeps it from running, or the files and the pair it converts. */
export type Readiness
  = | ({ kind: 'blocked' } & Blocker)
    | { kind: 'ready'; files: number; pair: EnginePair };

/** Whether Convert can run with `files` files and the engines picked. */
export function convertReadiness({ files, pair }: { files: number; pair: EnginePair | null }): Readiness {
  if (files === 0 && pair === null) return { kind: 'blocked', reason: { id: 'blocker-files-and-engines' }, quiet: false };
  if (files === 0) return { kind: 'blocked', reason: { id: 'blocker-files' }, quiet: true };
  if (pair === null) return { kind: 'blocked', reason: { id: 'blocker-engines' }, quiet: false };
  return { kind: 'ready', files, pair };
}
