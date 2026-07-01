import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
    report: { unmapped_source: {}, fallback_used: {}, dropped: {} },
  }),
}));

import App from '../src/App';

describe('App edit view', () => {
  it('navigates to edit and back', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('midiremap')).toBeInTheDocument());
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(screen.getByText('Edit mapping')).toBeInTheDocument();
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Save mapping/));
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
  });
});
