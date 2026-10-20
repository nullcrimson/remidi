import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import { RUNTIME } from './runtime';
import type { RemapOutput, VocabularyDrum, VoiceRow } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { typed } from './typed';
import { pickFrom, pickTo } from './eventSteps';

const fromBox = () => screen.getByRole('combobox', { name: 'Filter FROM engines' });
const toBox = () => screen.getByRole('combobox', { name: 'Filter TO engines' });
const card = (side: 'FROM' | 'TO') =>
  within(screen.getByRole('group', { name: `${side} engine` })).getByRole('button', { name: new RegExp(`^${side}`) });
const convertButton = () => screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ });

async function addFile() {
  const input = screen.getAllByTestId('file-input')[0] as HTMLInputElement;
  const file = new File([new Uint8Array([1])], 'groove.mid');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  fireEvent.change(input);
}

async function start() {
  render(<App runtime={RUNTIME} />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
}

describe('keyboard use', () => {
  beforeEach(() => {
    document.body.focus();
    vi.mocked(stub.engine_drums).mockReturnValue([]);
    vi.mocked(stub.engine_notes).mockReturnValue([]);
    vi.mocked(stub.canon_catalog).mockReturnValue(typed<VocabularyDrum[]>([
      { canon: 'kick.main', label: 'Kick', family: 'Kick' },
    ]));
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'kick.main', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
    ]));
    vi.mocked(stub.remap).mockReturnValue(typed<RemapOutput>({
      bytes: new Uint8Array([1]),
      report: { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 10 },
    }));
  });

  it('reaches Convert from page load in fewer than 12 Tabs', async () => {
    await start();
    let tabs = 0;
    const tab = async () => {
      tabs += 1;
      await userEvent.tab();
    };
    await tab();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await tab();
    expect(document.activeElement).toHaveTextContent(/Drop one or more \.mid files/);
    await addFile();
    await waitFor(() => expect(card('FROM')).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(fromBox()).toHaveFocus());
    await userEvent.keyboard('ggd{Enter}');
    await waitFor(() => expect(card('FROM')).toHaveFocus());
    await tab();
    expect(screen.getByRole('button', { name: 'Swap FROM and TO' })).toHaveFocus();
    await tab();
    expect(card('TO')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(toBox()).toHaveFocus());
    await userEvent.keyboard('ez{Enter}');
    while (document.activeElement !== convertButton() && tabs < 20) await tab();
    expect(convertButton()).toHaveFocus();
    expect(tabs).toBeLessThan(12);
  });

  it('moves focus to the TO engine card after a file is added with only FROM chosen', async () => {
    await start();
    await pickFrom('GGD Invasion');
    await addFile();
    await waitFor(() => expect(card('TO')).toHaveFocus());
  });

  it('moves focus to Convert after a file is added with both engines chosen', async () => {
    await start();
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await addFile();
    await waitFor(() => expect(convertButton()).toHaveFocus());
  });

  it('moves focus to Convert after the file is removed and added again', async () => {
    await start();
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await addFile();
    await userEvent.click(await screen.findByRole('button', { name: 'Remove groove.mid' }));
    await addFile();
    await waitFor(() => expect(convertButton()).toHaveFocus());
  });

  async function convertToResult() {
    await start();
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await addFile();
    await waitFor(() => expect(convertButton()).toBeEnabled());
    await userEvent.click(convertButton());
    return screen.findByRole('heading', { name: '1 file converted → EZdrummer' });
  }

  it('announces the result by focusing it', async () => {
    const heading = await convertToResult();
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('returns to the file picker for more', async () => {
    await convertToResult();
    await userEvent.click(screen.getByRole('button', { name: 'Convert more' }));
    expect(document.activeElement).toHaveTextContent(/Drop one or more \.mid files/);
  });

  async function openEditor() {
    await start();
    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');
    await userEvent.click(screen.getByRole('button', { name: /Edit individual notes/ }));
  }

  it('focuses the editor heading', async () => {
    await openEditor();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Edit notes' })).toHaveFocus());
  });

  it('comes back to the edit link from Done', async () => {
    await openEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: /Edit individual notes/ })).toHaveFocus();
  });

  it('comes back to the edit link from Back', async () => {
    await openEditor();
    await userEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByRole('button', { name: /Edit individual notes/ })).toHaveFocus();
  });
});
