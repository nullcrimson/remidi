import type { Remapper } from './useRemapper';
import type { Note } from '../core/midiremap';
import { track } from '../core/stats';
import type { StatEvents } from '../core/umami';
import type { EditFilter } from '../editor/editFilter';
import type { CloseHow } from '../editor/editorTally';
import { useEditorHistory } from '../editor/useEditorHistory';
import type { FocusTarget } from '../ui/useFocusIntent';

type EditorSource = StatEvents['editor-opened']['from'];

/**
 * Opening and closing the note editor as one session: the event of each, the session's tally,
 * the view, the browser's Back and Forward, and focus back on the edit link at the end.
 */
export function useEditorSession(remapper: Remapper, request: (target: FocusTarget) => void) {
  const { editor, view, pair } = remapper;
  const open = (from: EditorSource, show: EditFilter = 'all', note: Note | null = null) => {
    track('editor-opened', { show, from });
    editor.beginSession();
    remapper.openEditor(show, note);
  };
  const close = (how: CloseHow) => {
    editor.endSession(how);
    remapper.closeEditor();
    request('editLink');
  };
  useEditorHistory(view.kind === 'edit', { canOpen: pair !== null, open: () => open('history'), close: () => close('history') });
  return { open, close };
}
