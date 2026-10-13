import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KeyboardPane } from '../../src/editor/KeyboardPane';
import { note } from '../typed';

describe('KeyboardPane', () => {
  it('picks a note from its keyboard', async () => {
    const onPickNote = vi.fn();
    render(<KeyboardPane octIndex={4} currentNote={note(60)} base="c2" onSetOct={() => {}} onPickNote={onPickNote} />);
    await userEvent.click(screen.getAllByRole('button', { name: /^[A-G]#?3$/ })[0]);
    expect(onPickNote).toHaveBeenCalledTimes(1);
  });

  it('shows the octave of the highest note as the pressed tab', () => {
    render(<KeyboardPane octIndex={9} currentNote={note(127)} base="c1" onSetOct={() => {}} onPickNote={() => {}} />);
    expect(screen.getByRole('button', { name: '9', pressed: true })).toBeVisible();
  });

  it('switches to the octave of the highest note from its tab', async () => {
    const onSetOct = vi.fn();
    render(<KeyboardPane octIndex={4} currentNote={note(60)} base="c1" onSetOct={onSetOct} onPickNote={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: '9' }));
    expect(onSetOct).toHaveBeenCalledWith(9);
  });

  it('picks the highest note from the keyboard of its octave', async () => {
    const onPickNote = vi.fn();
    render(<KeyboardPane octIndex={9} currentNote={null} base="c1" onSetOct={() => {}} onPickNote={onPickNote} />);
    await userEvent.click(screen.getByRole('button', { name: 'G9' }));
    expect(onPickNote).toHaveBeenCalledWith(127);
  });
});
