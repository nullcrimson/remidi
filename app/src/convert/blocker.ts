import type { Message } from '../generated/i18n';
import type { ConvertActions } from './convertActions';

/** Why Convert is unavailable. */
export interface Blocker<R = Message> {
  reason: R;
  /** Said only beside the mouse and to screen readers, not under the button: the empty file row already asks for it. */
  quiet: boolean;
}

/** Whether Convert can run: what keeps it from running, or the files and the ways to convert them. */
export type Readiness
  = | ({ kind: 'blocked' } & Blocker)
    | { kind: 'ready'; files: number; actions: ConvertActions; waiting: number };

/**
 * Whether Convert can run with `files` files, `waiting` of them still waiting for their drum
 * parts to be picked, and `actions`, the ways to convert the setup on show, `null` until both
 * engines are picked.
 */
export function convertReadiness({ files, waiting, actions }: { files: number; waiting: number; actions: ConvertActions | null }): Readiness {
  if (files === 0 && actions === null) return { kind: 'blocked', reason: { id: 'blocker-files-and-engines' }, quiet: false };
  if (files === 0) return { kind: 'blocked', reason: { id: 'blocker-files' }, quiet: true };
  if (actions === null) return { kind: 'blocked', reason: { id: 'blocker-engines' }, quiet: false };
  if (waiting >= files) return { kind: 'blocked', reason: { id: 'blocker-parts' }, quiet: false };
  return { kind: 'ready', files: files - waiting, actions, waiting };
}
