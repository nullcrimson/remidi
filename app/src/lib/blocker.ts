import type { Message } from '../generated/i18n';

/** Why Convert is unavailable, or `null` when it can run. */
export function convertBlocker({ files, src, tgt }: { files: number; src: string; tgt: string }): Message | null {
  const engines = src !== '' && tgt !== '';
  if (files === 0 && !engines) return { id: 'blocker-files-and-engines' };
  if (files === 0) return { id: 'blocker-files' };
  if (!engines) return { id: 'blocker-engines' };
  return null;
}
