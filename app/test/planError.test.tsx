import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import { useRemapper } from '../src/convert/useRemapper';
import { RUNTIME } from './runtime';
import type { StoredEdits } from '../src/core/overrides';
import type { Overrides, CanonEntry, VoicePlan } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { engineId, typed } from './typed';
import { storedName } from '../src/core/storage';

const MAPPINGS_KEY = storedName('mappings');

const ROW = typed<VoicePlan>({ canon: 'kick.main', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', note: 36 } });

function planThatRejectsBogus(_s: string, _t: string, ov?: Overrides | null) {
  if (ov && 'bogus.canon' in ov.edits) throw new Error('unknown canon bogus.canon');
  return [ROW];
}

const PRESET = {
  id: 'p1',
  name: 'Old preset',
  src: engineId('ggd_invasion'),
  tgt: engineId('ezdrummer'),
  edits: typed<StoredEdits['edits']>({ 'bogus.canon': 40 }),
  srcEdits: {},
  updatedAt: 1,
};

const CLEAN_PRESET = { ...PRESET, edits: {} };

describe('plan errors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.engine_notes).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(
      typed<CanonEntry[]>([{ canon: 'bogus.canon', label: 'Bogus', family: 'Kick' }]),
    );
    vi.mocked(stub.plan).mockImplementation(planThatRejectsBogus);
  });

  it('become an editor error instead of a render throw', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.loadMapping(PRESET));
    expect(result.current.editor.planError).toEqual({ kind: 'internal', detail: 'unknown canon bogus.canon' });
    expect(result.current.editor.rows).toEqual([]);
  });

  it('are cleared by reset', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.loadMapping(PRESET));
    act(() => result.current.editor.reset());
    expect(result.current.editor.planError).toBeNull();
    expect(result.current.editor.rows).toHaveLength(1);
  });

  it('become the editor error when a drum lookup fails, not an editor without drums', async () => {
    vi.mocked(stub.engine_drums).mockImplementation(() => {
      throw new Error('unknown engine ezdrummer');
    });
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    act(() => result.current.loadMapping(CLEAN_PRESET));
    expect(result.current.editor.planError).toEqual({ kind: 'internal', detail: 'unknown engine ezdrummer' });
    expect(result.current.editor.rows).toEqual([]);
  });

  it('shows a notice on the convert view when a drum lookup fails', async () => {
    vi.mocked(stub.engine_notes).mockImplementation(() => {
      throw new Error('unknown engine ggd_invasion');
    });
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify([CLEAN_PRESET]));
    render(<App runtime={RUNTIME} />);
    await userEvent.click((await screen.findAllByRole('button', { name: /Old preset/ }))[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('unknown engine ggd_invasion');
  });

  it('shows a notice on the convert view', async () => {
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify([PRESET]));
    render(<App runtime={RUNTIME} />);
    await userEvent.click((await screen.findAllByRole('button', { name: /Old preset/ }))[0]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The note editor could not load: Something went wrong Details: unknown canon bogus.canon');
    expect(screen.queryByText(/of 1 drum remapped/)).not.toBeInTheDocument();
  });

  it('clears the notice with Reset edits', async () => {
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify([PRESET]));
    render(<App runtime={RUNTIME} />);
    await userEvent.click((await screen.findAllByRole('button', { name: /Old preset/ }))[0]);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Reset edits' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/of 1 drum remapped/)).toBeInTheDocument();
  });
});
