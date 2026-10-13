import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import { useRemapper } from '../src/convert/useRemapper';
import { RUNTIME } from './runtime';
import { MAPPINGS_KEY } from '../src/presets/mappings';
import type { StoredEdits } from '../src/core/overrides';
import type { Overrides, VocabularyDrum, VoiceRow } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { typed } from './typed';

const ROW = typed<VoiceRow>({ canon: 'kick.main', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } });

function planThatRejectsBogus(_s: string, _t: string, ov?: Overrides | null) {
  if (ov?.tgt?.some((e) => e.canon === 'bogus.canon')) throw new Error('unknown canon bogus.canon');
  return [ROW];
}

const PRESET = {
  id: 'p1',
  name: 'Old preset',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: typed<StoredEdits['edits']>({ 'bogus.canon': 40 }),
  srcEdits: {},
  updatedAt: 1,
};

describe('plan errors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.engine_notes).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(
      typed<VocabularyDrum[]>([{ canon: 'bogus.canon', label: 'Bogus', family: 'Kick' }]),
    );
    vi.mocked(stub.plan).mockImplementation(planThatRejectsBogus);
  });

  it('become an editor error instead of a render throw, and reset clears them', async () => {
    const { result } = renderHook(() => useRemapper(RUNTIME));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.loadMapping(PRESET));
    expect(result.current.editor.planError).toEqual({ kind: 'internal', detail: 'unknown canon bogus.canon' });
    expect(result.current.editor.rows).toEqual([]);
    act(() => result.current.editor.reset());
    expect(result.current.editor.planError).toBeNull();
    expect(result.current.editor.rows).toHaveLength(1);
  });

  it('shows a notice with Reset edits on the convert view', async () => {
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify([PRESET]));
    render(<App runtime={RUNTIME} />);
    await userEvent.click((await screen.findAllByRole('button', { name: /Old preset/ }))[0]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The note editor could not load: Something went wrong Details: unknown canon bogus.canon');
    expect(screen.queryByText(/of 1 drum remapped/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset edits' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/of 1 drum remapped/)).toBeInTheDocument();
  });
});
