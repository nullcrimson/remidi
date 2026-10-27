import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import { RUNTIME } from './runtime';
import type { Converted, CanonEntry, VoicePlan } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { typed } from './typed';
import { openSettings, pickFrom, pickTo } from './eventSteps';

function reportWith(untouched: number, converted = 10) {
  return typed<Converted>({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: { 'china.1.hit': 2 }, untouched, converted },
  });
}

async function pickEnginesAndFile() {
  render(<App runtime={RUNTIME} />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
  await pickFrom('GGD Invasion');
  await pickTo('EZdrummer');
  const input = screen.getAllByTestId('file-input')[0];
  await userEvent.upload(input, new File([new Uint8Array([1])], 'groove.mid'));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ })).toBeEnabled(),
  );
}

async function convertOneFile() {
  await pickEnginesAndFile();
  await userEvent.click(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /View report/i })).toBeInTheDocument(),
  );
}

describe('App loss report', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.engine_notes).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(typed<CanonEntry[]>([
      { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
    ]));
    vi.mocked(stub.plan).mockReturnValue(typed<VoicePlan[]>([
      { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals', srcNotes: [60], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } },
    ]));
    vi.mocked(stub.remap).mockReturnValue(reportWith(0));
  });

  it('shows no unchanged-notes count on the done card when none were left', async () => {
    await convertOneFile();
    expect(screen.queryByText(/on other channels unchanged/)).not.toBeInTheDocument();
  });

  it('opens the report modal from the done card', async () => {
    await convertOneFile();
    await userEvent.click(screen.getByRole('button', { name: /View report/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Conversion report' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('China 1')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
    expect(screen.queryByText(/left as they were/)).not.toBeInTheDocument();
  });

  it('counts notes left on other channels on the done card', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportWith(168));
    await convertOneFile();
    expect(screen.getByText('168 on other channels unchanged')).toBeInTheDocument();
  });

  it('counts notes left on other channels in the report', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportWith(168));
    await convertOneFile();
    await userEvent.click(screen.getByRole('button', { name: /View report/i }));
    await screen.findByRole('dialog', { name: 'Conversion report' });
    expect(screen.getByText('Notes on other tracks or channels, left as they were')).toBeInTheDocument();
    expect(screen.getByText('×168')).toBeInTheDocument();
  });

  it('says nothing was converted on the done card', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportWith(1188, 0));
    await convertOneFile();
    expect(screen.getByText('nothing converted')).toBeInTheDocument();
  });

  it('uses the singular for one converted note', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportWith(0, 1));
    await convertOneFile();
    expect(screen.getByText('1 note converted')).toBeInTheDocument();
  });

  it('converts with the drum channel picked under the octave toggle', async () => {
    await pickEnginesAndFile();
    await openSettings();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Drum channel' }), '10');
    await userEvent.click(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }));
    await waitFor(() => expect(stub.remap).toHaveBeenCalled());
    expect(vi.mocked(stub.remap).mock.calls[0][4]).toBe('10');
  });
});
