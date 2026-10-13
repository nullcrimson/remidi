import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PianoKeyboard } from '../../src/editor/PianoKeyboard';
import { note } from '../typed';

describe('PianoKeyboard', () => {
  it('emits the note of a clicked white key', async () => {
    const onPick = vi.fn();
    render(<PianoKeyboard octIndex={3} currentNote={note(48)} base="c1" onPickNote={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: 'D3' }));
    expect(onPick).toHaveBeenCalledWith(50);
  });

  it('emits the note of a clicked black key', async () => {
    const onPick = vi.fn();
    render(<PianoKeyboard octIndex={3} currentNote={note(48)} base="c1" onPickNote={onPick} />);
    await userEvent.click(screen.getByTestId('black-1'));
    expect(onPick).toHaveBeenCalledWith(49);
  });

  it('labels the black key with its pitch name', () => {
    render(<PianoKeyboard octIndex={3} currentNote={note(48)} base="c1" onPickNote={() => {}} />);
    expect(screen.getByTestId('black-1')).toHaveAttribute('aria-label', 'C#3');
  });

  it('disables the four keys above note 127', () => {
    render(<PianoKeyboard octIndex={9} currentNote={null} base="c1" onPickNote={() => {}} />);
    const disabled = screen.getAllByRole('button', { hidden: true }).filter((key) => key.matches(':disabled'));
    expect(disabled.map((key) => key.textContent || key.dataset.testid)).toEqual(['A', 'B', 'black-8', 'black-10']);
  });

  it('emits nothing when a key above note 127 is clicked', () => {
    const onPick = vi.fn();
    render(<PianoKeyboard octIndex={9} currentNote={null} base="c1" onPickNote={onPick} />);
    fireEvent.click(screen.getByTestId('black-10'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('hides a disabled key from assistive technology', () => {
    render(<PianoKeyboard octIndex={9} currentNote={null} base="c1" onPickNote={() => {}} />);
    expect(screen.getByTestId('black-10')).toHaveAttribute('aria-hidden', 'true');
  });

  it('marks the current note key active', () => {
    render(<PianoKeyboard octIndex={3} currentNote={note(48)} base="c1" onPickNote={() => {}} />);
    expect(screen.getByRole('button', { name: 'C3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'D3' })).toHaveAttribute('aria-pressed', 'false');
  });
});
