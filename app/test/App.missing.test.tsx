import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/core/download', () => ({ saveBlob: vi.fn() }));

import App from '../src/App';
import { RUNTIME } from './runtime';
import type { Drum, MissingDrums, RemapOutput, VocabularyDrum, VoiceRow } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { typed } from './typed';

function remapFor(missing: MissingDrums | null | undefined) {
  return typed<RemapOutput>({
    bytes: new Uint8Array([1]),
    report: {
      unmappedSource: {},
      fallbackUsed: missing === 'drop' ? {} : { 'china.1.hit': { note: 49, count: 3 } },
      dropped: missing === 'drop' ? { 'china.1.hit': 3 } : {},
      untouched: 0,
      converted: 10,
    },
  });
}

async function convertOneFile() {
  render(<App runtime={RUNTIME} />);
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
    vi.mocked(stub.engine_drums).mockReturnValue(typed<Drum[]>([
      { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
    ]));
    vi.mocked(stub.engine_notes).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(typed<VocabularyDrum[]>([
      { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
    ]));
    vi.mocked(stub.plan).mockImplementation((_src, _tgt, _overrides, missing) => typed<VoiceRow[]>([
      missing === 'drop'
        ? { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals', srcNotes: [60], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: true } }
        : { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals', srcNotes: [60], defaultTgtNote: 49, outcome: { status: 'fallback', tgtNote: 49, otherDrum: true } },
    ]));
    vi.mocked(stub.remap).mockImplementation((_mid, _src, _tgt, _overrides, _channel, missing) => remapFor(missing));
  });

  it('shows the setting third, with a live hint for the pair', async () => {
    render(<App runtime={RUNTIME} />);
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
    await waitFor(() => expect(stub.remap).toHaveBeenCalledTimes(2));
    expect(vi.mocked(stub.remap).mock.lastCall?.[5]).toBe('drop');
    await waitFor(() => expect(screen.getByText('3 dropped', { selector: 'li' })).toBeInTheDocument());
    expect(screen.getByRole('radio', { name: 'Drop' })).toBeChecked();
    expect(screen.queryByRole('button', { name: DROP_LINK })).not.toBeInTheDocument();
  });

  it('offers the same step inside the report', async () => {
    await convertOneFile();
    await userEvent.click(screen.getByRole('button', { name: /View report/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Conversion report' });
    await userEvent.click(within(dialog).getByRole('button', { name: DROP_LINK }));
    await waitFor(() => expect(vi.mocked(stub.remap).mock.lastCall?.[5]).toBe('drop'));
  });
});
