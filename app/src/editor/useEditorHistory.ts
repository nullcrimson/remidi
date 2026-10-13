import { useEffect, useRef } from 'react';

const MARK = 'noteEditor';

const inEditorEntry = () => (history.state as Record<string, unknown> | null)?.[MARK] === true;

/**
 * Keeps the note editor in the browser history. Opening it adds an entry at the same
 * address, so Back closes the editor instead of leaving the converter and Forward opens it
 * again; closing it in the app steps back over that entry. When Forward lands on the
 * editor's entry while it cannot open (`canOpen` is false), history steps back so the
 * entry and the screen agree.
 */
export function useEditorHistory(
  editing: boolean,
  { canOpen, open, close }: { canOpen: boolean; open: () => void; close: () => void },
) {
  const latest = useRef({ editing, canOpen, open, close });
  useEffect(() => {
    latest.current = { editing, canOpen, open, close };
  });

  useEffect(() => {
    if (editing && !inEditorEntry()) {
      history.pushState({ ...(history.state as Record<string, unknown> | null), [MARK]: true }, '');
    }
    if (!editing && inEditorEntry()) history.back();
  }, [editing]);

  useEffect(() => {
    const onPop = () => {
      const { editing: now, canOpen: can, open: reopen, close: leave } = latest.current;
      if (inEditorEntry() && !now) {
        if (can) reopen();
        else history.back();
      }
      if (!inEditorEntry() && now) leave();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
