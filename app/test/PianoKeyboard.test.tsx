import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PianoKeyboard } from '../src/components/PianoKeyboard';

describe('PianoKeyboard', () => {
  it('emits the semitone of a clicked white key', async () => {
    const onPick = vi.fn();
    render(<PianoKeyboard octIndex={3} currentNote={48} onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: 'D' }));
    expect(onPick).toHaveBeenCalledWith(2);
  });

  it('emits the semitone of a clicked black key', async () => {
    const onPick = vi.fn();
    render(<PianoKeyboard octIndex={3} currentNote={48} onPick={onPick} />);
    await userEvent.click(screen.getByTestId('black-1'));
    expect(onPick).toHaveBeenCalledWith(1);
  });

  it('marks the current note key active', () => {
    render(<PianoKeyboard octIndex={3} currentNote={48} onPick={() => {}} />);
    expect(screen.getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'D' })).toHaveAttribute('aria-pressed', 'false');
  });
});
