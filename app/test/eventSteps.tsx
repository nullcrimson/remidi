import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../src/App';
import { storedName, type StorageKey } from '../src/core/storage';
import { RUNTIME } from './runtime';

export interface StoredPreset {
  id: string;
  name: string;
  src: string;
  tgt: string;
  edits: Record<string, number>;
  srcEdits: Record<string, string | null>;
  updatedAt: number;
}

export const MY_KIT: StoredPreset = {
  id: 'p1',
  name: 'My kit',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 40 },
  srcEdits: {},
  updatedAt: 1,
};

export function store(key: StorageKey, value: unknown): void {
  localStorage.setItem(storedName(key), JSON.stringify(value));
}

export function storePresets(...presets: StoredPreset[]): void {
  store('mappings', { version: 1, items: presets });
}

/** Makes the browser refuse to store the presets, and lets every other write through. */
export function failWrites() {
  const realSetItem = localStorage.setItem.bind(localStorage);
  return vi.spyOn(localStorage, 'setItem').mockImplementation((name, value) => {
    if (name === storedName('mappings')) throw new DOMException('full', 'QuotaExceededError');
    realSetItem(name, value);
  });
}

export async function startApp(): Promise<void> {
  render(<App runtime={RUNTIME} />);
  await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
}

/** The card that opens one side's engine picker. */
export const engineCard = (side: 'FROM' | 'TO'): HTMLElement =>
  within(screen.getByRole('group', { name: `${side} engine` })).getByRole('button', { name: new RegExp(`^${side}`) });

/** The Convert button, named for what it converts once it can run. */
export const convertButton = (): HTMLElement => screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ });

/** Opens the engine picker of one side from its card. */
export async function openPicker(side: 'FROM' | 'TO'): Promise<HTMLElement> {
  await userEvent.click(engineCard(side));
  return screen.findByRole('dialog', { name: `Choose the ${side} engine` });
}

/** Opens the picker of one side and picks the engine called `name` in it. */
export async function pickEngine(side: 'FROM' | 'TO', name: string): Promise<void> {
  const picker = await openPicker(side);
  await userEvent.click(within(picker).getByRole('option', { name }));
}

export const pickFrom = (name: string) => pickEngine('FROM', name);

export const pickTo = (name: string) => pickEngine('TO', name);

export async function pickEngines(): Promise<void> {
  await pickFrom('GGD Invasion');
  await pickTo('EZdrummer');
}

/** Unfolds the conversion settings. */
export async function openSettings(): Promise<void> {
  await userEvent.click(screen.getByText('Settings', { selector: 'summary span' }));
}

export async function addMidi(...names: string[]): Promise<void> {
  const files = names.map((name) => new File([new Uint8Array([1])], name));
  await userEvent.upload(screen.getAllByTestId('file-input')[0], files);
}

export async function convert(): Promise<void> {
  await userEvent.click(convertButton());
  await screen.findByRole('button', { name: /View report/i });
}

export async function openEditor(): Promise<void> {
  await userEvent.click(screen.getByText(/Edit individual notes/));
}
