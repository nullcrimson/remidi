import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import type { Midiremap, VoiceRow } from '../src/lib/midiremap';
import type { Runtime } from '../src/lib/runtime';
import { RUNTIME } from './runtime';
import * as stub from './stubs/wasm';
import { typed } from './typed';

describe('App states', () => {
  it('shows the loading state before the module is ready', () => {
    const loading: Runtime = { ...RUNTIME, load: () => new Promise<Midiremap>(() => {}) };
    render(<App runtime={loading} />);
    expect(screen.getByRole('heading', { name: /^Drumverter/ })).toBeInTheDocument();
    expect(screen.getByText(/Loading converter/i)).toBeInTheDocument();
  });

  it('shows the error state when init fails', async () => {
    const failing: Runtime = { ...RUNTIME, load: () => Promise.reject(new Error('wasm boom')) };
    render(<App runtime={failing} />);
    expect(screen.getByRole('heading', { name: /^Drumverter/ })).toBeInTheDocument();
    expect(await screen.findByText(/Failed to load converter/i)).toBeInTheDocument();
    expect(screen.getByText(/wasm boom/)).toBeInTheDocument();
  });

  it('shows the conversion error banner when a file fails to convert', async () => {
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
    ]));
    vi.mocked(stub.remap).mockImplementation(() => {
      throw new Error('bad midi');
    });
    render(<App runtime={RUNTIME} />);
    await screen.findByText('FROM');
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    await userEvent.upload(
      screen.getByTestId('file-input'),
      new File([new Uint8Array([1])], 'g.mid', { type: 'audio/midi' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error: Something went wrong Details: bad midi');
  });
});
