import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NotePicker } from '../../src/editor/NotePicker';
import type { Drum } from '../../src/core/midiremap';
import { family_order } from '../stubs/wasm';
import { note, typed } from '../typed';

const DRUMS = typed<Drum[]>([{ note: 36, canon: 'kick.main', label: 'Kick', family: 'Kick' as const }]);

function renderPicker(overrides: Partial<ComponentProps<typeof NotePicker>> = {}) {
  render(
    <NotePicker
      voiceLabel="Kick"
      currentNote={note(60)}
      octIndex={4}
      base="c1"
      drums={[]}
      families={family_order()}
      onSetOct={() => {}}
      onPickNote={() => {}}
      onClose={() => {}}
      {...overrides}
    />,
  );
}

describe('NotePicker', () => {
  it('shows the current note name', () => {
    renderPicker({ base: 'c2' });
    expect(screen.getByText('C3')).toBeInTheDocument();
  });

  it('labels tabs by base', () => {
    renderPicker({ base: 'c2' });
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('changes octave', async () => {
    const onSetOct = vi.fn();
    renderPicker({ onSetOct });
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onSetOct).toHaveBeenCalledWith(2);
  });

  it('closes', async () => {
    const onClose = vi.fn();
    renderPicker({ onClose });
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close when clicking an octave tab', async () => {
    const onClose = vi.fn();
    renderPicker({ onClose });
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders drum families and picks a drum note', async () => {
    const onPickDrum = vi.fn();
    renderPicker({ drums: DRUMS, onPickNote: onPickDrum });
    await userEvent.click(screen.getByRole('button', { name: /Kick/ }));
    expect(onPickDrum).toHaveBeenCalledWith(36);
  });

  it('shows a dash when there is no current note', () => {
    renderPicker({ currentNote: null, octIndex: 2, drums: DRUMS });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('puts the drum list beside the piano only when the picker itself is wide enough', () => {
    renderPicker({ currentNote: note(36), octIndex: 2, drums: DRUMS });
    const layout = screen.getByTestId('picker-layout');
    expect(layout.parentElement).toHaveClass('@container');
    expect(layout).toHaveClass('flex-col', '@2xl:flex-row');
    expect(layout).not.toHaveClass('sm:flex-row');
  });
});
