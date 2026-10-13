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
});
