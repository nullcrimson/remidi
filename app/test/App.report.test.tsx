import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const remapMock = vi.fn();

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [],
  engineNotes: () => [],
  canonCatalog: () => [{ canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' }],
  plan: () => [
    { canon: 'china.1.hit', label: 'China 1', srcNotes: [60], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } },
  ],
  remap: (...a: unknown[]) => remapMock(...a),
}));

import App from '../src/App';

function reportWith(untouched: number, converted = 10) {
  return {
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: { 'china.1.hit': 2 }, untouched, converted },
  };
}

async function pickEnginesAndFile() {
  render(<App />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
  await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
  await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
  const input = screen.getAllByTestId('file-input')[0];
  await userEvent.upload(input, new File([new Uint8Array([1])], 'groove.mid'));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Convert' })).toBeEnabled(),
  );
}

async function convertOneFile() {
  await pickEnginesAndFile();
  await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /View report/i })).toBeInTheDocument(),
  );
}

describe('App loss report', () => {
  beforeEach(() => {
    remapMock.mockReset().mockReturnValue(reportWith(0));
  });

  it('opens the report modal from the done card', async () => {
    await convertOneFile();
    expect(screen.queryByText(/on other channels unchanged/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /View report/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Conversion report' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('China 1')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
    expect(screen.queryByText(/left as they were/)).not.toBeInTheDocument();
  });

  it('counts notes left on other channels on the done card and in the report', async () => {
    remapMock.mockReturnValue(reportWith(168));
    await convertOneFile();
    expect(screen.getByText('168 on other channels unchanged')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /View report/i }));
    await screen.findByRole('dialog', { name: 'Conversion report' });
    expect(screen.getByText('Notes on other tracks or channels, left as they were')).toBeInTheDocument();
    expect(screen.getByText('×168')).toBeInTheDocument();
  });

  it('says nothing was converted on the done card', async () => {
    remapMock.mockReturnValue(reportWith(1188, 0));
    await convertOneFile();
    expect(screen.getByText('nothing converted')).toBeInTheDocument();
  });

  it('uses the singular for one converted note', async () => {
    remapMock.mockReturnValue(reportWith(0, 1));
    await convertOneFile();
    expect(screen.getByText('1 note converted')).toBeInTheDocument();
  });

  it('converts with the drum channel picked under the octave toggle', async () => {
    await pickEnginesAndFile();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Drum channel' }), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
    await waitFor(() => expect(remapMock).toHaveBeenCalled());
    expect(remapMock.mock.calls[0][4]).toBe('10');
  });
});
