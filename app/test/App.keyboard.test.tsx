import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/midiremap', () => ({
  ready: () => Promise.resolve(),
  engines: () => [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ],
  engineDrums: () => [],
  engineNotes: () => [],
  canonCatalog: () => [{ canon: 'kick.main', label: 'Kick', family: 'Kick' }],
  plan: () => [
    { canon: 'kick.main', label: 'Kick', srcNotes: [24], tgtNote: 36, defaultTgtNote: 36, status: 'direct' },
  ],
  remap: () => ({
    bytes: new Uint8Array([1]),
    report: { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 10 },
  }),
}));
vi.mock('../src/lib/download', () => ({ saveFile: vi.fn() }));

import App from '../src/App';

const fromBox = () => screen.getByRole('combobox', { name: 'Filter FROM engines' });
const toBox = () => screen.getByRole('combobox', { name: 'Filter TO engines' });
const convertButton = () => screen.getByRole('button', { name: /Convert & download/ });

async function addFile() {
  const input = screen.getAllByTestId('file-input')[0] as HTMLInputElement;
  const file = new File([new Uint8Array([1])], 'groove.mid');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  fireEvent.change(input);
}

async function start() {
  render(<App />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
}

describe('keyboard use', () => {
  beforeEach(() => {
    document.body.focus();
  });

  it('reaches Convert from page load in fewer than 10 Tabs', async () => {
    await start();
    let tabs = 0;
    const tab = async () => {
      tabs += 1;
      await userEvent.tab();
    };
    await tab();
    expect(document.activeElement).toHaveTextContent(/Drop a \.mid/);
    await addFile();
    await waitFor(() => expect(fromBox()).toHaveFocus());
    await userEvent.keyboard('ggd{Enter}');
    await tab();
    expect(screen.getByRole('button', { name: 'Swap FROM and TO' })).toHaveFocus();
    await tab();
    expect(toBox()).toHaveFocus();
    await userEvent.keyboard('ez{Enter}');
    while (document.activeElement !== convertButton() && tabs < 20) await tab();
    expect(convertButton()).toHaveFocus();
    expect(tabs).toBeLessThan(10);
  });

  it('moves focus to the next missing step after files are added', async () => {
    await start();
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await addFile();
    await waitFor(() => expect(toBox()).toHaveFocus());
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove groove.mid' }));
    await addFile();
    await waitFor(() => expect(convertButton()).toHaveFocus());
  });

  it('announces the result by focusing it, and returns to the file picker for more', async () => {
    await start();
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    await addFile();
    await waitFor(() => expect(convertButton()).toBeEnabled());
    await userEvent.click(convertButton());
    const heading = await screen.findByRole('heading', { name: '1 file converted → EZdrummer' });
    await waitFor(() => expect(heading).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: 'Convert more' }));
    expect(document.activeElement).toHaveTextContent(/Drop a \.mid/);
  });

  it('focuses the editor heading and comes back to the edit link', async () => {
    await start();
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    await userEvent.click(screen.getByRole('button', { name: /Edit individual notes/ }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Edit notes' })).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: /Edit individual notes/ })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: /Edit individual notes/ }));
    await userEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByRole('button', { name: /Edit individual notes/ })).toHaveFocus();
  });
});
