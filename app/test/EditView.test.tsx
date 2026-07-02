import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditView } from '../src/components/EditView';

const editor = {
  rows: [{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' as const }],
  edits: {},
  srcEdits: {},
  pick: null,
  targetDrums: [],
  sourceNotes: [{ note: 24, canon: 'kick.main', label: 'Kick', family: 'Kick' }],
  canonOptions: [{ canon: 'kick.main', label: 'Kick', family: 'Kick' }],
  remappedCount: 0,
  droppedCount: 0,
  openPick: vi.fn(),
  openSrcPick: vi.fn(),
  setPickOct: vi.fn(),
  chooseNote: vi.fn(),
  chooseNoteAbsolute: vi.fn(),
  chooseSrcNote: vi.fn(),
  setSrcCanon: vi.fn(),
  clearSrcCanon: vi.fn(),
  closePick: vi.fn(),
  reset: vi.fn(),
  load: vi.fn(),
};

const props = {
  editor,
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  oct: 'c1' as const,
  existingPreset: undefined,
  presetsAtCap: false,
  setView: vi.fn(),
  onSavePreset: vi.fn(),
  onUpdatePreset: vi.fn(),
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

  it('opens the target picker from the target chip', async () => {
    const openPick = vi.fn();
    render(<EditView {...props} editor={{ ...editor, openPick }} />);
    await userEvent.click(screen.getByRole('button', { name: 'C2' }));
    expect(openPick).toHaveBeenCalledWith('KickMain');
  });

  it('opens the source picker from the source chip', async () => {
    const openSrcPick = vi.fn();
    render(<EditView {...props} editor={{ ...editor, openSrcPick }} />);
    await userEvent.click(screen.getByRole('button', { name: 'C1' }));
    expect(openSrcPick).toHaveBeenCalledWith('KickMain');
  });

  it('shows the target picker dialog when a row target is the active pick', () => {
    render(
      <EditView
        {...props}
        editor={{ ...editor, pick: { canon: 'KickMain', octIndex: 2, side: 'tgt', defaultNote: null } }}
      />,
    );
    expect(screen.getByRole('dialog', { name: /Target note for Kick/i })).toBeInTheDocument();
  });

  it('shows the source picker dialog when a row source is the active pick', () => {
    render(
      <EditView
        {...props}
        editor={{ ...editor, pick: { canon: 'KickMain', octIndex: 2, side: 'src', defaultNote: null } }}
      />,
    );
    expect(screen.getByRole('dialog', { name: /Source note for Kick/i })).toBeInTheDocument();
  });

  it('disables Save preset when there are no edits', () => {
    render(<EditView {...props} editor={{ ...editor, edits: {} }} />);
    expect(screen.getByRole('button', { name: 'Save preset' })).toBeDisabled();
  });

  it('reveals the advanced source editor on demand', async () => {
    render(<EditView {...props} />);
    expect(screen.queryByLabelText('Add source note')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Advanced/i }));
    expect(screen.getByLabelText('Add source note')).toBeInTheDocument();
  });

  it('enables Save preset when only source edits exist', () => {
    render(<EditView {...props} editor={{ ...editor, edits: {}, srcEdits: { 60: 'china.1.hit' } }} />);
    expect(screen.getByRole('button', { name: 'Save preset' })).toBeEnabled();
  });

  it('saves a new preset with the prefilled pair name', async () => {
    const onSavePreset = vi.fn();
    render(
      <EditView {...props} editor={{ ...editor, edits: { KickMain: 40 } }} onSavePreset={onSavePreset} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    expect(screen.getByLabelText('Preset name')).toHaveValue('GGD→EZD');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSavePreset).toHaveBeenCalledWith('GGD→EZD');
  });

  it('updates an existing preset for the same pair', async () => {
    const onUpdatePreset = vi.fn();
    const existingPreset = {
      id: 'p1',
      name: 'mine',
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: {},
      srcEdits: {},
      updatedAt: 1,
    };
    render(
      <EditView
        {...props}
        editor={{ ...editor, edits: { KickMain: 40 } }}
        existingPreset={existingPreset}
        onUpdatePreset={onUpdatePreset}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Update preset' }));
    expect(screen.getByLabelText('Preset name')).toHaveValue('mine');
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onUpdatePreset).toHaveBeenCalledWith('p1', 'mine');
  });
});
