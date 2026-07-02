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
    { canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' },
    { canon: 'China', label: 'China', srcNote: 59, tgtNote: null, status: 'dropped' },
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
    expect(screen.getByText('Edit mapping')).toBeInTheDocument();
    expect(screen.getByText('GGD → EZD')).toBeInTheDocument();
  });

  it('navigates to edit and back', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'EZdrummer' })[1]);
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(screen.getByText('Edit mapping')).toBeInTheDocument();
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Save mapping/));
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
  });
});
