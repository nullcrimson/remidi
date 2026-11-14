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
    | { kind: 'ready'; files: number; pair: EnginePair; waiting: number };

/** Whether Convert can run with `files` files, `waiting` of them still waiting for their drum parts to be picked, and the engines picked. */
export function convertReadiness({ files, waiting, pair }: { files: number; waiting: number; pair: EnginePair | null }): Readiness {
  if (files === 0 && pair === null) return { kind: 'blocked', reason: { id: 'blocker-files-and-engines' }, quiet: false };
  if (files === 0) return { kind: 'blocked', reason: { id: 'blocker-files' }, quiet: true };
  if (pair === null) return { kind: 'blocked', reason: { id: 'blocker-engines' }, quiet: false };
  if (waiting >= files) return { kind: 'blocked', reason: { id: 'blocker-parts' }, quiet: false };
  return { kind: 'ready', files: files - waiting, pair, waiting };
}
