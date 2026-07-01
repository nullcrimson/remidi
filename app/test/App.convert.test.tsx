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
    report: { unmapped_source: {}, fallback_used: {}, dropped: {} },
  }),
}));

import App from '../src/App';

describe('App convert view', () => {
  it('renders the converter after load', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('midiremap')).toBeInTheDocument());
    expect(screen.getByText('FROM')).toBeInTheDocument();
    expect(screen.getByText('TO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Convert & download/i })).toBeInTheDocument();
    expect(screen.getByText(/Edit individual notes/)).toBeInTheDocument();
  });
});
