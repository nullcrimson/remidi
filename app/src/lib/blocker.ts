/** Why Convert is unavailable, or `null` when it can run. */
export function convertBlocker({ files, src, tgt }: { files: number; src: string; tgt: string }): string | null {
  const engines = src !== '' && tgt !== '';
  if (files === 0 && !engines) return 'Add a .mid file and pick both engines';
  if (files === 0) return 'Add a .mid file to convert';
  if (!engines) return 'Pick a FROM and a TO engine';
  return null;
}
