import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DrumList } from '../src/components/DrumList';
import { family_order } from './stubs/wasm';

const DRUMS = [
  { note: 36, canon: 'kick.main', label: 'Kick', family: 'Kick' as const },
  { note: 38, canon: 'snare1.hit', label: 'Snare', family: 'Snare' as const },
  { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' as const },
];

describe('DrumList', () => {
  it('renders family headers and picks a drum note', async () => {
    const onPick = vi.fn();
    render(<DrumList drums={DRUMS} families={family_order()} currentNote={38} base="c1" onPickNote={onPick} />);
    expect(screen.getByText('Cymbals')).toBeInTheDocument();
    expect(screen.getAllByText('Kick')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: /Crash 1/ }));
    expect(onPick).toHaveBeenCalledWith(49);
  });

  it('marks the row matching the current note', () => {
    render(<DrumList drums={DRUMS} families={family_order()} currentNote={38} base="c1" onPickNote={() => {}} />);
    expect(screen.getByRole('button', { name: /Snare/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
