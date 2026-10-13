import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorHistory } from '../../src/editor/useEditorHistory';

type View = 'convert' | 'edit';

function setup() {
  return renderHook(() => {
    const [view, setView] = useState<View>('convert');
    useEditorHistory(view === 'edit', { canOpen: true, open: () => setView('edit'), close: () => setView('convert') });
    return { view, setView };
  });
}

describe('useEditorHistory', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/');
  });

  it('adds a history entry at the same address when the editor opens', () => {
    const { result } = setup();
    const before = history.length;
    act(() => result.current.setView('edit'));
    expect(history.length).toBe(before + 1);
    expect(location.pathname).toBe('/');
  });

  it('closes the editor on browser Back instead of leaving the page', async () => {
    const { result } = setup();
    act(() => result.current.setView('edit'));
    act(() => history.back());
    await waitFor(() => expect(result.current.view).toBe('convert'));
  });

  it('steps back over its entry when the editor is closed in the app', async () => {
    const { result } = setup();
    act(() => result.current.setView('edit'));
    act(() => result.current.setView('convert'));
    await waitFor(() => expect(history.state).toBeNull());
    expect(result.current.view).toBe('convert');
  });

  it('closes the editor on Back after it was closed and opened again in the app', async () => {
    const { result } = setup();
    act(() => result.current.setView('edit'));
    act(() => result.current.setView('convert'));
    await waitFor(() => expect(history.state).toBeNull());
    act(() => result.current.setView('edit'));
    act(() => history.back());
    await waitFor(() => expect(result.current.view).toBe('convert'));
    expect(history.state).toBeNull();
  });

  it('opens the editor again on Forward', async () => {
    const { result } = setup();
    act(() => result.current.setView('edit'));
    act(() => history.back());
    await waitFor(() => expect(result.current.view).toBe('convert'));
    act(() => history.forward());
    await waitFor(() => expect(result.current.view).toBe('edit'));
  });

  it('adds no history entry when Forward reopens the editor', async () => {
    const { result } = setup();
    act(() => result.current.setView('edit'));
    act(() => history.back());
    await waitFor(() => expect(result.current.view).toBe('convert'));
    const before = history.length;
    act(() => history.forward());
    await waitFor(() => expect(result.current.view).toBe('edit'));
    expect(history.length).toBe(before);
  });

  it('steps back off the editor’s entry on Forward when the editor cannot open', async () => {
    let canOpen = true;
    const { result, rerender } = renderHook(() => {
      const [view, setView] = useState<View>('convert');
      useEditorHistory(view === 'edit', { canOpen, open: () => setView('edit'), close: () => setView('convert') });
      return { view, setView };
    });
    act(() => result.current.setView('edit'));
    act(() => history.back());
    await waitFor(() => expect(result.current.view).toBe('convert'));
    canOpen = false;
    rerender();
    act(() => history.forward());
    await waitFor(() => expect(history.state).toBeNull());
    expect(result.current.view).toBe('convert');
  });
});
