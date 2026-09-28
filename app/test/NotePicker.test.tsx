import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotePicker } from '../src/components/NotePicker';
import { family_order } from './stubs/wasm';

const DRUMS = [{ note: 36, canon: 'kick.main', label: 'Kick', family: 'Kick' as const }];

describe('NotePicker', () => {
  it('labels tabs by base and shows the current note name', () => {
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={60}
        octIndex={4}
        base="c2"
        drums={[]}
        families={family_order()}
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
        families={family_order()}
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
        families={family_order()}
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
        families={family_order()}
        onSetOct={() => {}}
        onPickSemitone={() => {}}
        onPickNote={onPickDrum}
        onClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Kick/ }));
    expect(onPickDrum).toHaveBeenCalledWith(36);
  });

  it('shows a dash when there is no current note', () => {
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={null}
        octIndex={2}
        base="c1"
        drums={DRUMS}
        families={family_order()}
        onSetOct={() => {}}
        onPickSemitone={() => {}}
        onPickNote={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('puts the drum list beside the piano only when the picker itself is wide enough', () => {
    render(
      <NotePicker
        voiceLabel="Kick"
        currentNote={36}
        octIndex={2}
        base="c1"
        drums={DRUMS}
        families={family_order()}
        onSetOct={() => {}}
        onPickSemitone={() => {}}
        onPickNote={() => {}}
        onClose={() => {}}
      />,
    );
    const layout = screen.getByTestId('picker-layout');
    expect(layout.parentElement).toHaveClass('@container');
    expect(layout).toHaveClass('flex-col', '@2xl:flex-row');
    expect(layout).not.toHaveClass('sm:flex-row');
  });
});
