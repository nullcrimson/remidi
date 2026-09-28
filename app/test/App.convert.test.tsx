import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  plan: () => [{ canon: 'KickMain', label: 'Kick', srcNotes: [24], tgtNote: 36, defaultTgtNote: 36, status: 'direct' }],
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {} },
  }),
}));

import userEvent from '@testing-library/user-event';

import App from '../src/App';

describe('App convert view', () => {
  it('disables convert and hides edit until both engines are chosen', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /^Drumverter/ })).toBeInTheDocument();
    expect(screen.getByText('TO')).toBeInTheDocument();

    const editButton = () => screen.queryByRole('button', { name: /Edit individual notes/i });
    expect(editButton()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Convert & download/i })).toBeDisabled();

    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);

    expect(editButton()).toBeEnabled();
  });
});
