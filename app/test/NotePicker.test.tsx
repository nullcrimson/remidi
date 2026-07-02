import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotePicker } from '../src/components/NotePicker';

const DRUMS = [{ note: 36, canon: 'kick.main', label: 'Kick', family: 'Kick' }];

describe('NotePicker', () => {
  it('labels tabs by base and shows the current note name', () => {
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={60}
        octIndex={4}
        base="c2"
        drums={[]}
        onSetOct={() => {}}
        onPickSemitone={() => {}}
        onPickNote={() => {}}
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
        drums={[]}
        onSetOct={onSetOct}
        onPickSemitone={() => {}}
        onPickNote={() => {}}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onSetOct).toHaveBeenCalledWith(2);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
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
        drums={[]}
        onSetOct={() => {}}
        onPickSemitone={() => {}}
        onPickNote={() => {}}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders drum families and picks a drum note', async () => {
    const onPickDrum = vi.fn();
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={60}
        octIndex={4}
        base="c1"
        drums={DRUMS}
        onSetOct={() => {}}
        onPickSemitone={() => {}}
        onPickNote={onPickDrum}
        onClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Kick/ }));
    expect(onPickDrum).toHaveBeenCalledWith(36);
  });
});
