import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {} };

describe('App states', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.doUnmock('../src/lib/midiremap'));

  it('shows the loading state before the module is ready', async () => {
    vi.doMock('../src/lib/midiremap', () => ({
      ready: () => new Promise<void>(() => {}),
      engines: () => [],
      plan: () => [],
      remap: () => ({ bytes: new Uint8Array(), report: REPORT }),
      engineDrums: () => [],
    }));
    const { default: App } = await import('../src/App');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Remidi' })).toBeInTheDocument();
    expect(screen.getByText(/Loading converter/i)).toBeInTheDocument();
  });

  it('shows the error state when init fails', async () => {
    vi.doMock('../src/lib/midiremap', () => ({
      ready: () => Promise.reject(new Error('wasm boom')),
      engines: () => [],
      plan: () => [],
      remap: () => ({ bytes: new Uint8Array(), report: REPORT }),
      engineDrums: () => [],
    }));
    const { default: App } = await import('../src/App');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Remidi' })).toBeInTheDocument();
    expect(await screen.findByText(/Failed to load converter/i)).toBeInTheDocument();
    expect(screen.getByText(/wasm boom/)).toBeInTheDocument();
  });

  it('shows the conversion error banner when a file fails to convert', async () => {
    vi.doMock('../src/lib/midiremap', () => ({
      ready: () => Promise.resolve(),
      engines: () => [
        { id: 'ggd_invasion', name: 'GGD Invasion' },
        { id: 'ezdrummer', name: 'EZdrummer' },
      ],
      plan: () => [{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }],
      remap: () => {
        throw new Error('bad midi');
      },
      engineDrums: () => [],
    }));
    const { default: App } = await import('../src/App');
    render(<App />);
    await screen.findByText('FROM');
    await userEvent.click(screen.getAllByRole('button', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'EZdrummer' })[1]);
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File([new Uint8Array([1])], 'g.mid', { type: 'audio/midi' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Convert & download/i }));
    expect(await screen.findByText(/Error:.*bad midi/i)).toBeInTheDocument();
  });
});
