import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAPPINGS_KEY } from '../src/lib/mappings';

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  plan: () => [
    { canon: 'KickMain', label: 'Kick', srcNotes: [24], tgtNote: 36, defaultTgtNote: 36, status: 'direct' },
    { canon: 'China', label: 'China', srcNotes: [59], tgtNote: null, defaultTgtNote: null, status: 'dropped' },
  ],
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {} },
  }),
}));

import App from '../src/App';

describe('App edit view', () => {
  beforeEach(() => localStorage.clear());

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
    const stored = JSON.parse(localStorage.getItem(MAPPINGS_KEY)!) as { id: string; updatedAt: number }[];
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
    await userEvent.click(screen.getAllByRole('button', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'EZdrummer' })[1]);
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(screen.getByRole('button', { name: 'Save as preset' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update preset' })).not.toBeInTheDocument();
  });

  it('navigates to edit and back', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'EZdrummer' })[1]);
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
  });
});
