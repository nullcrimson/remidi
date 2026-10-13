import { render, screen, waitFor } from '@testing-library/react';
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

export async function pickEngines(): Promise<void> {
  await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
  await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
}

export async function addMidi(...names: string[]): Promise<void> {
  const files = names.map((name) => new File([new Uint8Array([1])], name));
  await userEvent.upload(screen.getAllByTestId('file-input')[0], files);
}

export async function convert(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
  await screen.findByRole('button', { name: /View report/i });
}

export async function openEditor(): Promise<void> {
  await userEvent.click(screen.getByText(/Edit individual notes/));
}
