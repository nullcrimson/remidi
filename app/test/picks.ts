import type { Editor } from '../src/editor/useEditor';
import type { SrcPick, TgtPick } from '../src/editor/editorState';

/** The target picker the editor has open; fails the test when it is not that one. */
export function shownTgtPick({ overlay }: Pick<Editor, 'overlay'>): TgtPick {
  if (overlay?.kind !== 'tgt') throw new Error('no target picker is open');
  return overlay;
}

/** The source picker the editor has open; fails the test when it is not that one. */
export function shownSrcPick({ overlay }: Pick<Editor, 'overlay'>): SrcPick {
  if (overlay?.kind !== 'src') throw new Error('no source picker is open');
  return overlay;
}
