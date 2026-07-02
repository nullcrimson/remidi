import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  plan: () => [{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }],
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {} },
  }),
}));

import userEvent from '@testing-library/user-event';

import App from '../src/App';

describe('App convert view', () => {
  it('disables convert and edit until both engines are chosen', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Remidi' })).toBeInTheDocument();
    expect(screen.getByText('TO')).toBeInTheDocument();

    const editButton = () => screen.getByRole('button', { name: /Edit individual notes/i });
    expect(editButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: /Convert & download/i })).toBeDisabled();

    await userEvent.click(screen.getAllByRole('button', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'EZdrummer' })[1]);

    expect(editButton()).toBeEnabled();
  });
});
