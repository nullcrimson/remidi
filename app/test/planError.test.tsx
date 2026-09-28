import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const planMock = vi.fn();
vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [],
  engineNotes: () => [],
  canonCatalog: () => [],
  plan: (...a: unknown[]) => planMock(...a),
  remap: vi.fn(),
}));

import App from '../src/App';
import { useRemapper } from '../src/hooks/useRemapper';
import { MAPPINGS_KEY } from '../src/lib/mappings';

const ROW = { canon: 'kick.main', label: 'Kick', srcNotes: [24], tgtNote: 36, defaultTgtNote: 36, status: 'direct', otherDrum: false };

function planThatRejectsBogus(_s: string, _t: string, ov: { tgt: { canon: string }[] }) {
  if (ov.tgt.some((e) => e.canon === 'bogus.canon')) throw new Error('unknown canon bogus.canon');
  return [ROW];
}

const PRESET = {
  id: 'p1',
  name: 'Old preset',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'bogus.canon': 40 },
  srcEdits: {},
  updatedAt: 1,
};

describe('plan errors', () => {
  beforeEach(() => {
    localStorage.clear();
    planMock.mockReset().mockImplementation(planThatRejectsBogus);
  });

  it('become an editor error instead of a render throw, and reset clears them', async () => {
    const { result } = renderHook(() => useRemapper());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.loadMapping(PRESET));
    expect(result.current.editor.planError).toBe('Error: unknown canon bogus.canon');
    expect(result.current.editor.rows).toEqual([]);
    act(() => result.current.editor.reset());
    expect(result.current.editor.planError).toBeNull();
    expect(result.current.editor.rows).toHaveLength(1);
  });

  it('shows a notice with Reset edits on the convert view', async () => {
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify([PRESET]));
    render(<App />);
    await userEvent.click((await screen.findAllByRole('button', { name: /Old preset/ }))[0]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The note editor could not load: Error: unknown canon bogus.canon');
    expect(screen.queryByText(/drums remapped/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset edits' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/drums remapped/)).toBeInTheDocument();
  });
});
