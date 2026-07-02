import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [],
  engineNotes: () => [],
  canonCatalog: () => [],
  plan: () => [
    { canon: 'china.1.hit', label: 'China 1', srcNote: 60, tgtNote: null, status: 'dropped' },
  ],
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: { 'china.1.hit': 2 } },
  }),
}));

import App from '../src/App';

describe('App loss report', () => {
  it('opens the report modal from the done card', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'EZdrummer' })[1]);

    const input = screen.getAllByTestId('file-input')[0];
    await userEvent.upload(input, new File([new Uint8Array([1])], 'groove.mid'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Convert & download/i })).toBeEnabled(),
    );

    await userEvent.click(screen.getByRole('button', { name: /Convert & download/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /View report/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /View report/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Conversion report' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('China 1')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });
});
