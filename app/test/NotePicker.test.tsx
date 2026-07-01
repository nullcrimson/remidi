import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotePicker } from '../src/components/NotePicker';

describe('NotePicker', () => {
  it('labels tabs by base and shows the current note name', () => {
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={60}
        octIndex={4}
        base="c2"
        onSetOct={() => {}}
        onPick={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('C3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('changes octave and closes', async () => {
    const onSetOct = vi.fn();
    const onClose = vi.fn();
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={60}
        octIndex={4}
        base="c1"
        onSetOct={onSetOct}
        onPick={() => {}}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onSetOct).toHaveBeenCalledWith(2);
    await userEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on outside mousedown', () => {
    const onClose = vi.fn();
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={60}
        octIndex={4}
        base="c1"
        onSetOct={() => {}}
        onPick={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={60}
        octIndex={4}
        base="c1"
        onSetOct={() => {}}
        onPick={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when clicking an octave tab', async () => {
    const onClose = vi.fn();
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={60}
        octIndex={4}
        base="c1"
        onSetOct={() => {}}
        onPick={() => {}}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
