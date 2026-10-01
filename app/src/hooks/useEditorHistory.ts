import { useEffect, useRef } from 'react';

const MARK = 'noteEditor';

const inEditorEntry = () => (history.state as Record<string, unknown> | null)?.[MARK] === true;

/**
 * Keeps the note editor in the browser history. Opening it adds an entry at the same
 * address, so Back closes the editor instead of leaving the converter and Forward opens it
 * again; closing it in the app steps back over that entry.
 */
export function useEditorHistory(
  view: 'convert' | 'edit',
  { open, close }: { open: () => void; close: () => void },
) {
  const latest = useRef({ view, open, close });
  useEffect(() => {
    latest.current = { view, open, close };
  });

  useEffect(() => {
    if (view === 'edit' && !inEditorEntry()) {
      history.pushState({ ...(history.state as Record<string, unknown> | null), [MARK]: true }, '');
    }
    if (view === 'convert' && inEditorEntry()) history.back();
  }, [view]);

  useEffect(() => {
    const onPop = () => {
      const { view: now, open: reopen, close: leave } = latest.current;
      if (inEditorEntry() && now === 'convert') reopen();
      if (!inEditorEntry() && now === 'edit') leave();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}
