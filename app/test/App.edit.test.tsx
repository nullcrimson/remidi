import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAPPINGS_KEY } from '../src/lib/mappings';
import { SESSION_KEY } from '../src/lib/session';

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  plan: () => [
    { canon: 'KickMain', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
    { canon: 'China', label: 'China', srcNotes: [59], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } },
  ],
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {} },
  }),
}));

import App from '../src/App';

describe('App edit view', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the edit view when a file is dropped on it', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
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
    render(<App />);
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
    render(<App />);
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
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(screen.getByRole('button', { name: 'Save as preset' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update preset' })).not.toBeInTheDocument();
  });

  it('shows no edited chip for the default mapping', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    expect(screen.getByText(/drums remapped/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edited — review changes/ })).not.toBeInTheDocument();
  });

  it('shows the loaded preset on an edited chip that opens the editor on the changed drums', async () => {
    localStorage.setItem(
      MAPPINGS_KEY,
      JSON.stringify([
        { id: 'p1', name: 'My kit', src: 'ggd_invasion', tgt: 'ezdrummer', edits: { KickMain: 40 }, srcEdits: {}, updatedAt: 1 },
      ]),
    );
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    const chip = screen.getByRole('button', { name: '1 drum edited — review changes, from preset My kit' });
    expect(chip).toHaveTextContent('My kit · 1 edited');
    await userEvent.click(chip);
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Changed 1' })).toBeChecked();
    expect(screen.queryByText('China')).not.toBeInTheDocument();
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
    render(<App />);
    const chip = await screen.findByRole('button', { name: '1 drum edited — review changes, not saved to My kit' });
    expect(chip).toHaveTextContent('1 edited · unsaved');
  });

  it('navigates to edit and back', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '—' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
  });
});
