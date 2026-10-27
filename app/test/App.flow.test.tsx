import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import { RUNTIME } from './runtime';
import { recordDownloads } from './downloads';
import type { Converted, CanonEntry, VoicePlan } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { typed } from './typed';
import { pickFrom, pickTo } from './eventSteps';

async function start() {
  render(<App runtime={RUNTIME} />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
}

async function pickEngines() {
  await pickFrom('GGD Invasion');
  await pickTo('EZdrummer');
}

async function upload(...names: string[]) {
  const files = names.map((n) => new File([new Uint8Array([1])], n));
  await userEvent.upload(screen.getAllByTestId('file-input')[0], files);
}

async function convertAndOpenReport() {
  await start();
  await pickEngines();
  await upload('groove.mid');
  await userEvent.click(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }));
  await userEvent.click(await screen.findByRole('button', { name: /View report/i }));
  return screen.findByRole('dialog', { name: 'Conversion report' });
}

const downloads = recordDownloads();

describe('App convert flow', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.engine_notes).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(typed<CanonEntry[]>([
      { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
      { canon: 'kick.main', label: 'Kick', family: 'Kick' },
    ]));
    vi.mocked(stub.plan).mockReturnValue(typed<VoicePlan[]>([
      { canon: 'kick.main', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', note: 36 } },
      { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals', srcNotes: [60], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } },
    ]));
    vi.mocked(stub.remap).mockReturnValue(typed<Converted>({
      bytes: new Uint8Array([1]),
      report: {
        unmappedSource: { 51: 3 },
        fallbackUsed: {},
        dropped: { 'china.1.hit': 2 },
        untouched: 5,
        converted: 10,
      },
    }));
  });

  it('shows the edit summary only once both engines are chosen', async () => {
    await start();
    expect(screen.queryByText(/drums remapped/)).not.toBeInTheDocument();
    await pickEngines();
    expect(screen.getByText(/drums remapped/)).toBeInTheDocument();
  });

  it('keeps both engine columns inside the card', async () => {
    await start();
    expect(screen.getByRole('group', { name: 'FROM engine' }).parentElement).toHaveClass(
      'sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
    );
  });

  it('spaces the tagline dash', async () => {
    await start();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('— drum MIDI converter');
  });

  it('widens the converter on large screens', async () => {
    await start();
    expect(screen.getByTestId('page-column')).toHaveClass('w-200', 'lg:w-240', 'xl:w-280');
  });

  it('keeps the editor narrow', async () => {
    await start();
    await pickEngines();
    await userEvent.click(screen.getByRole('button', { name: /Edit individual notes/ }));
    expect(screen.getByTestId('page-column')).toHaveClass('w-200');
    expect(screen.getByTestId('page-column')).not.toHaveClass('lg:w-240');
  });

  it('disables swap before any engine is chosen', async () => {
    await start();
    const swap = screen.getByRole('button', { name: 'Swap FROM and TO' });
    expect(swap).toBeDisabled();
  });

  it('names the chosen engines in the list headings', async () => {
    await start();
    await pickEngines();
    const from = screen.getByRole('group', { name: 'FROM engine' });
    const to = screen.getByRole('group', { name: 'TO engine' });
    expect(within(from).getByTestId('chosen-engine')).toHaveTextContent('GGD Invasion');
    expect(within(to).getByTestId('chosen-engine')).toHaveTextContent('EZdrummer');
  });

  it('swaps the chosen engines', async () => {
    await start();
    await pickEngines();
    const swap = screen.getByRole('button', { name: 'Swap FROM and TO' });
    const from = screen.getByRole('group', { name: 'FROM engine' });
    const to = screen.getByRole('group', { name: 'TO engine' });
    await userEvent.click(swap);
    expect(within(from).getByTestId('chosen-engine')).toHaveTextContent('EZdrummer');
    expect(within(to).getByTestId('chosen-engine')).toHaveTextContent('GGD Invasion');
  });

  it('converts first and offers the file to download', async () => {
    await start();
    await pickEngines();
    await upload('groove.mid');
    await userEvent.click(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }));
    expect(await screen.findByText('1 file converted → EZdrummer')).toBeInTheDocument();
    expect(downloads()).toEqual([]);
    const download = screen.getByRole('link', { name: '↓ Download .mid' });
    expect(download).toHaveAttribute('href', 'blob:mock-url');
    expect(download).toHaveAttribute('download', 'groove-ezdrummer.mid');
  });

  it('Convert more empties the files and keeps the engines', async () => {
    await start();
    await pickEngines();
    await upload('groove.mid');
    await userEvent.click(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }));
    await screen.findByText('1 file converted → EZdrummer');
    await userEvent.click(screen.getByRole('button', { name: 'Convert more' }));
    expect(screen.queryByText('groove.mid')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ })).toBeDisabled();
    expect(within(screen.getByRole('group', { name: 'FROM engine' })).getByTestId('chosen-engine')).toHaveTextContent(
      'GGD Invasion',
    );
  });

  it('opens the target picker of a dropped drum from the report', async () => {
    const dialog = await convertAndOpenReport();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pick a target →' }));
    expect(screen.getByText('Edit notes')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Target note for China 1' })).toBeInTheDocument();
  });

  it('opens the source editor on an unrecognized note from the report', async () => {
    const dialog = await convertAndOpenReport();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Assign →' }));
    expect(screen.getByRole('button', { name: /Advanced/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Canon for D#3' })).toBeInTheDocument();
  });

  it('takes unchanged notes to the drum channel setting', async () => {
    const dialog = await convertAndOpenReport();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Drum channel →' }));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Drum channel' })).toHaveFocus(),
    );
    expect(screen.queryByRole('dialog', { name: 'Conversion report' })).not.toBeInTheDocument();
  });
});
