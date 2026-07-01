import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditView } from '../src/components/EditView';

const props = {
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  oct: 'c1' as const,
  rows: [{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' as const }],
  edits: {},
  pick: null,
  targetDrums: [],
  setView: vi.fn(),
  openPick: vi.fn(),
  setPickOct: vi.fn(),
  chooseNote: vi.fn(),
  chooseNoteAbsolute: vi.fn(),
  closePick: vi.fn(),
};

describe('EditView', () => {
  it('renders rows and returns to convert view', async () => {
    const setView = vi.fn();
    render(<EditView {...props} setView={setView} />);
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('GGD → EZD')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(setView).toHaveBeenCalledWith('convert');
  });

  it('opens the picker for a row', async () => {
    const openPick = vi.fn();
    render(<EditView {...props} openPick={openPick} />);
    await userEvent.click(screen.getByRole('button', { name: 'C2' }));
    expect(openPick).toHaveBeenCalledWith('KickMain');
  });

  it('shows the picker dialog when a row is the active pick', () => {
    render(<EditView {...props} pick={{ canon: 'KickMain', octIndex: 2 }} />);
    expect(screen.getByRole('dialog', { name: /Target note for Kick/i })).toBeInTheDocument();
  });
});
