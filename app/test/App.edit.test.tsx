import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { RUNTIME } from './runtime';
import type { VocabularyDrum, VoiceRow } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { typed } from './typed';
import { storedName } from '../src/core/storage';
import { pickFrom, pickTo } from './eventSteps';

const MAPPINGS_KEY = storedName('mappings');
const SESSION_KEY = storedName('session');

describe('App edit view', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(typed<VocabularyDrum[]>([
      { canon: 'KickMain', label: 'Kick', family: 'Aux' },
      { canon: 'China', label: 'China', family: 'Aux' },
    ]));
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
      { canon: 'China', label: 'China', family: 'Cymbals', srcNotes: [59], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } },
    ]));
  });

  it('keeps the edit view when a file is dropped on it', async () => {
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await userEvent.click(screen.getByRole('button', { name: /Edit individual notes/ }));
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
    const drop = new Event('drop', { cancelable: true });
    window.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
  });

  it('edits a saved preset straight from its chip', async () => {
    localStorage.setItem(
      MAPPINGS_KEY,
      JSON.stringify([
        {
          id: 'p1',
          name: 'My kit',
          src: 'ggd_invasion',
          tgt: 'ezdrummer',
          edits: { 'kick.main': 40 },
          srcEdits: {},
          updatedAt: 1,
        },
      ]),
    );
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Edit notes for My kit' }));
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
    expect(screen.getByText('GGD Invasion → EZdrummer')).toBeInTheDocument();
  });

  it('updates the preset opened from its chip, not the newest one for the pair', async () => {
    const preset = (id: string, name: string, updatedAt: number) => ({
      id,
      name,
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: { KickMain: 40 },
      srcEdits: {},
      updatedAt,
    });
    localStorage.setItem(
      MAPPINGS_KEY,
      JSON.stringify([preset('p1', 'Original', 1), preset('p2', 'Original copy', 2)]),
    );
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Edit notes for Original' }));
    await userEvent.click(screen.getByRole('button', { name: 'Update preset' }));
    expect(screen.getByRole('textbox', { name: 'Preset name' })).toHaveValue('Original');
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    const stored = (JSON.parse(localStorage.getItem(MAPPINGS_KEY)!) as { items: { id: string; updatedAt: number }[] }).items;
    expect(stored.find((m) => m.id === 'p1')!.updatedAt).toBeGreaterThan(2);
    expect(stored.find((m) => m.id === 'p2')!.updatedAt).toBe(2);
  });

  it('offers a new preset, not an update, when engines were picked by hand', async () => {
    localStorage.setItem(
      MAPPINGS_KEY,
      JSON.stringify([
        { id: 'p1', name: 'Mine', src: 'ggd_invasion', tgt: 'ezdrummer', edits: {}, srcEdits: {}, updatedAt: 1 },
      ]),
    );
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(screen.getByRole('button', { name: 'Save as preset' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update preset' })).not.toBeInTheDocument();
  });

  it('says in the edit view that a preset saved from the editor will be gone on reload', async () => {
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await userEvent.click(screen.getByText(/Edit individual notes/));
    const set = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    try {
      await userEvent.click(screen.getByRole('button', { name: 'Save as preset' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.getByRole('status')).toHaveTextContent(
        "Couldn't save presets: the browser's storage is full or blocked. They will be gone when you reload.",
      );
    } finally {
      set.mockRestore();
    }
  });

  it('shows no edited chip for the default mapping', async () => {
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    expect(screen.getByText(/drums remapped/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edited — review changes/ })).not.toBeInTheDocument();
  });

  async function loadMyKit() {
    localStorage.setItem(
      MAPPINGS_KEY,
      JSON.stringify([
        { id: 'p1', name: 'My kit', src: 'ggd_invasion', tgt: 'ezdrummer', edits: { KickMain: 40 }, srcEdits: {}, updatedAt: 1 },
      ]),
    );
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    return screen.getByRole('button', { name: '1 drum edited — review changes, from preset My kit' });
  }

  it('shows the loaded preset on an edited chip', async () => {
    const chip = await loadMyKit();
    expect(chip).toHaveTextContent('My kit · 1 edited');
  });

  it('opens the editor on the changed drums from the edited chip', async () => {
    const chip = await loadMyKit();
    await userEvent.click(chip);
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Changed 1' })).toBeChecked();
    expect(screen.queryByText('China')).not.toBeInTheDocument();
  });

  it('opens the editor on all drums from the edit link after the edited chip', async () => {
    const chip = await loadMyKit();
    await userEvent.click(chip);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await userEvent.click(screen.getByRole('button', { name: /Edit individual notes/ }));
    expect(screen.getByRole('radio', { name: 'All 2' })).toBeChecked();
  });

  it('marks restored edits that differ from the open preset as unsaved', async () => {
    localStorage.setItem(
      MAPPINGS_KEY,
      JSON.stringify([
        { id: 'p1', name: 'My kit', src: 'ggd_invasion', tgt: 'ezdrummer', edits: { KickMain: 40 }, srcEdits: {}, updatedAt: 1 },
      ]),
    );
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        version: 1,
        src: 'ggd_invasion',
        tgt: 'ezdrummer',
        oct: 'c1',
        channel: 'auto',
        missing: 'nearest',
        presetId: 'p1',
        edits: { KickMain: 41 },
        srcEdits: {},
      }),
    );
    render(<App runtime={RUNTIME} />);
    const chip = await screen.findByRole('button', { name: '1 drum edited — review changes, not saved to My kit' });
    expect(chip).toHaveTextContent('1 edited · unsaved');
  });

  it('navigates to edit', async () => {
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
    expect(screen.getAllByText('Kick')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '—' })).toBeInTheDocument();
  });

  it('navigates back from edit', async () => {
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await userEvent.click(screen.getByText(/Edit individual notes/));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
  });
});
