import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const remapMock = vi.fn();

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [{ note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' }],
  engineNotes: () => [],
  canonCatalog: () => [{ canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' }],
  plan: (_s: string, _t: string, _ov: unknown, missing: string) => [
    missing === 'drop'
      ? { canon: 'china.1.hit', label: 'China 1', srcNotes: [60], tgtNote: null, defaultTgtNote: null, status: 'dropped', otherDrum: true }
      : { canon: 'china.1.hit', label: 'China 1', srcNotes: [60], tgtNote: 49, defaultTgtNote: 49, status: 'fallback', otherDrum: true },
  ],
  remap: (...a: unknown[]) => remapMock(...a),
}));

vi.mock('../src/lib/download', () => ({ saveFile: vi.fn() }));

import App from '../src/App';

function remapFor(missing: string) {
  return {
    bytes: new Uint8Array([1]),
    report: {
      unmappedSource: {},
      fallbackUsed: missing === 'drop' ? {} : { 'china.1.hit': { note: 49, count: 3 } },
      dropped: missing === 'drop' ? { 'china.1.hit': 3 } : {},
      untouched: 0,
      converted: 10,
    },
  };
}

async function convertOneFile() {
  render(<App />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
  await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
  await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
  await userEvent.upload(screen.getAllByTestId('file-input')[0], new File([new Uint8Array([1])], 'groove.mid'));
  await userEvent.click(await screen.findByRole('button', { name: 'Convert' }));
  await screen.findByRole('button', { name: /View report/i });
}

const DROP_LINK = 'Drop missing drums & convert again';

describe('App missing drums', () => {
  beforeEach(() => {
    localStorage.clear();
    remapMock.mockReset().mockImplementation((...a: unknown[]) => remapFor(a[5] as string));
  });

  it('shows the setting third, with a live hint for the pair', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    const group = screen.getByRole('radiogroup', { name: 'Missing drums' });
    expect(within(group).getByRole('radio', { name: 'Nearest' })).toBeChecked();
    expect(screen.getByText('play on the closest drum')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    expect(screen.getByText('1 drum played on another drum')).toBeInTheDocument();
    await userEvent.click(within(group).getByText('Drop'));
    expect(screen.getByText('1 drum dropped')).toBeInTheDocument();
  });

  it('offers to drop a swapped drum after converting, and converts again with Drop', async () => {
    await convertOneFile();
    await userEvent.click(screen.getByRole('button', { name: DROP_LINK }));
    await waitFor(() => expect(remapMock).toHaveBeenCalledTimes(2));
    expect(remapMock.mock.lastCall?.[5]).toBe('drop');
    await waitFor(() => expect(screen.getByText('3 dropped', { selector: 'li' })).toBeInTheDocument());
    expect(screen.getByRole('radio', { name: 'Drop' })).toBeChecked();
    expect(screen.queryByRole('button', { name: DROP_LINK })).not.toBeInTheDocument();
  });

  it('offers the same step inside the report', async () => {
    await convertOneFile();
    await userEvent.click(screen.getByRole('button', { name: /View report/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Conversion report' });
    await userEvent.click(within(dialog).getByRole('button', { name: DROP_LINK }));
    await waitFor(() => expect(remapMock.mock.lastCall?.[5]).toBe('drop'));
  });
});
