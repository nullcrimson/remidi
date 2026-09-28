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
  engineDrums: () => [],
  engineNotes: () => [],
  canonCatalog: () => [
    { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
    { canon: 'kick.main', label: 'Kick', family: 'Kick' },
  ],
  plan: () => [
    { canon: 'kick.main', label: 'Kick', srcNotes: [24], tgtNote: 36, defaultTgtNote: 36, status: 'direct' },
    { canon: 'china.1.hit', label: 'China 1', srcNotes: [60], tgtNote: null, defaultTgtNote: null, status: 'dropped' },
  ],
  remap: (...a: unknown[]) => remapMock(...a),
}));
vi.mock('../src/lib/download', () => ({ saveFile: vi.fn() }));

import App from '../src/App';
import { saveFile } from '../src/lib/download';

async function start() {
  render(<App />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
}

async function pickEngines() {
  await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
  await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
}

async function upload(...names: string[]) {
  const files = names.map((n) => new File([new Uint8Array([1])], n));
  await userEvent.upload(screen.getAllByTestId('file-input')[0], files);
}

async function convertAndOpenReport() {
  await start();
  await pickEngines();
  await upload('groove.mid');
  await userEvent.click(screen.getByRole('button', { name: /Convert & download/i }));
  await userEvent.click(await screen.findByRole('button', { name: /View report/i }));
  return screen.findByRole('dialog', { name: 'Conversion report' });
}

describe('App convert flow', () => {
  beforeEach(() => {
    vi.mocked(saveFile).mockClear();
    remapMock.mockReset().mockReturnValue({
      bytes: new Uint8Array([1]),
      report: {
        unmappedSource: { 51: 3 },
        fallbackUsed: {},
        dropped: { 'china.1.hit': 2 },
        untouched: 5,
        converted: 10,
      },
    });
  });

  it('shows the edit summary only once both engines are chosen', async () => {
    await start();
    expect(screen.queryByText(/drums remapped/)).not.toBeInTheDocument();
    await pickEngines();
    expect(screen.getByText(/drums remapped/)).toBeInTheDocument();
  });

  it('keeps both engine columns inside the card and spaces the tagline dash', async () => {
    await start();
    expect(screen.getByRole('group', { name: 'FROM engine' }).parentElement).toHaveClass(
      'sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('— drum MIDI converter');
  });

  it('widens the converter on large screens but keeps the editor narrow', async () => {
    await start();
    expect(screen.getByTestId('page-column')).toHaveClass('w-200', 'lg:w-240', 'xl:w-280');
    await pickEngines();
    await userEvent.click(screen.getByRole('button', { name: /Edit individual notes/ }));
    expect(screen.getByTestId('page-column')).toHaveClass('w-200');
    expect(screen.getByTestId('page-column')).not.toHaveClass('lg:w-240');
  });

  it('names the chosen engines in the list headings and swaps them', async () => {
    await start();
    const swap = screen.getByRole('button', { name: 'Swap FROM and TO' });
    expect(swap).toBeDisabled();
    await pickEngines();
    const from = screen.getByRole('group', { name: 'FROM engine' });
    const to = screen.getByRole('group', { name: 'TO engine' });
    expect(within(from).getByTestId('chosen-engine')).toHaveTextContent('GGD Invasion');
    expect(within(to).getByTestId('chosen-engine')).toHaveTextContent('EZdrummer');
    await userEvent.click(swap);
    expect(within(from).getByTestId('chosen-engine')).toHaveTextContent('EZdrummer');
    expect(within(to).getByTestId('chosen-engine')).toHaveTextContent('GGD Invasion');
  });

  it('downloads a single file and offers Convert more', async () => {
    await start();
    await pickEngines();
    await upload('groove.mid');
    await userEvent.click(screen.getByRole('button', { name: /Convert & download/i }));
    expect(await screen.findByText('1 file converted → EZdrummer')).toBeInTheDocument();
    expect(saveFile).toHaveBeenCalledWith('blob:mock-url', 'groove-ezdrummer.mid');
    await userEvent.click(screen.getByRole('button', { name: 'Convert more' }));
    expect(screen.queryByText('groove.mid')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Convert & download/i })).toBeDisabled();
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
