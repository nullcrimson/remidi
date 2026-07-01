import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PianoKeyboard } from '../src/components/PianoKeyboard';

describe('PianoKeyboard', () => {
  it('emits the semitone of a clicked white key', async () => {
    const onPick = vi.fn();
    render(<PianoKeyboard octIndex={3} currentNote={48} base="c1" onPickSemitone={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: 'D3' }));
    expect(onPick).toHaveBeenCalledWith(2);
  });

  it('emits the semitone of a clicked black key', async () => {
    const onPick = vi.fn();
    render(<PianoKeyboard octIndex={3} currentNote={48} base="c1" onPickSemitone={onPick} />);
    await userEvent.click(screen.getByTestId('black-1'));
    expect(onPick).toHaveBeenCalledWith(1);
  });

  it('labels the black key with its pitch name', () => {
    render(<PianoKeyboard octIndex={3} currentNote={48} base="c1" onPickSemitone={() => {}} />);
    expect(screen.getByTestId('black-1')).toHaveAttribute('aria-label', 'C#3');
  });

  it('marks the current note key active', () => {
    render(<PianoKeyboard octIndex={3} currentNote={48} base="c1" onPickSemitone={() => {}} />);
    expect(screen.getByRole('button', { name: 'C3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'D3' })).toHaveAttribute('aria-pressed', 'false');
  });
});
