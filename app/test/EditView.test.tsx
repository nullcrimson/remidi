import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditView } from '../src/components/EditView';
import type { AppError } from '../src/lib/errors';
import { family_order } from './stubs/wasm';

const editor = {
  rows: [{ canon: 'KickMain', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct' as const, tgtNote: 36 } }],
  edits: {},
  srcEdits: {},
  pick: null,
  notice: null,
  planError: null as AppError | null,
  targetDrums: [],
  sourceNotes: [{ note: 24, canon: 'kick.main', label: 'Kick', family: 'Kick' as const }],
  canonOptions: [{ canon: 'kick.main', label: 'Kick', family: 'Kick' as const }],
  families: family_order(),
  remappedCount: 0,
  droppedCount: 0,
  changed: new Set<string>(),
  changedSrc: new Set<string>(),
  resetRow: vi.fn(),
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
  onSelection: vi.fn(),
};

const props = {
  editor,
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  srcName: 'GGD Invasion',
  tgtName: 'EZdrummer 3',
  oct: 'c1' as const,
  existingPreset: undefined,
  presetsAtCap: false,
  setView: vi.fn(),
  onSavePreset: vi.fn(),
  onUpdatePreset: vi.fn(),
};

describe('EditView', () => {
  it('shows a plan error with a way to reset the edits', async () => {
    const reset = vi.fn();
    render(<EditView {...props} editor={{ ...editor, rows: [], planError: { kind: 'internal', detail: 'unknown canon x' }, reset }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The note editor could not load: Something went wrong Details: unknown canon x');
    await userEvent.click(screen.getByRole('button', { name: 'Reset edits' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('tells which drum a picked source note came from', () => {
    render(
      <EditView
        {...props}
        editor={{ ...editor, notice: { canon: 'KickMain', note: 26, from: 'Snare' } }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('D1 was Snare — now plays Kick');
  });

  it('renders rows and returns to convert view', async () => {
    const setView = vi.fn();
    render(<EditView {...props} setView={setView} />);
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('GGD Invasion → EZdrummer 3')).toBeInTheDocument();
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
        editor={{ ...editor, pick: { canon: 'KickMain', octIndex: 2, side: 'tgt', defaultNote: null, prevNote: null } }}
      />,
    );
    expect(screen.getByRole('dialog', { name: /Target note for Kick/i })).toBeInTheDocument();
  });

  it('shows the source picker dialog when a row source is the active pick', () => {
    render(
      <EditView
        {...props}
        editor={{ ...editor, pick: { canon: 'KickMain', octIndex: 2, side: 'src', defaultNote: null, prevNote: 24 } }}
      />,
    );
    expect(screen.getByRole('dialog', { name: /Source note for Kick/i })).toBeInTheDocument();
  });

  it('saves a preset of just the engine pair when no notes changed', async () => {
    const onSavePreset = vi.fn();
    render(<EditView {...props} editor={{ ...editor, edits: {} }} onSavePreset={onSavePreset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save as preset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSavePreset).toHaveBeenCalledWith('GGD→EZD');
  });

  it('reveals the advanced source editor on demand', async () => {
    render(<EditView {...props} />);
    expect(screen.queryByLabelText('Add source note')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Advanced/i }));
    expect(screen.getByLabelText('Add source note')).toBeInTheDocument();
  });

  it('shows the advanced toggle as a full-width row with a turning chevron', async () => {
    render(<EditView {...props} />);
    const toggle = screen.getByRole('button', { name: /Advanced/i });
    expect(toggle).toHaveClass('w-full', 'rounded-panel', 'border');
    const chevron = toggle.querySelector('[aria-hidden="true"]');
    expect(chevron).not.toHaveClass('rotate-180');
    await userEvent.click(toggle);
    expect(chevron).toHaveClass('rotate-180');
  });

  it('enables Save as preset when only source edits exist', () => {
    render(<EditView {...props} editor={{ ...editor, edits: {}, srcEdits: { 60: 'china.1.hit' } }} />);
    expect(screen.getByRole('button', { name: 'Save as preset' })).toBeEnabled();
  });

  it('saves a new preset with the prefilled pair name', async () => {
    const onSavePreset = vi.fn();
    render(
      <EditView {...props} editor={{ ...editor, edits: { KickMain: 40 } }} onSavePreset={onSavePreset} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save as preset' }));
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

  it('marks the source chip of a silent row as changed', () => {
    render(
      <EditView
        {...props}
        editor={{
          ...editor,
          changedSrc: new Set(['KickMain']),
          rows: [{ canon: 'KickMain', label: 'Kick', srcNotes: [], defaultTgtNote: 36, outcome: { status: 'direct' as const, tgtNote: 36 } }],
        }}
      />,
    );
    expect(screen.getByRole('button', { name: '—' })).toHaveClass('border-accent/40');
  });

  it('shows a dash in the target picker of a dropped row', () => {
    render(
      <EditView
        {...props}
        editor={{
          ...editor,
          pick: { canon: 'China', octIndex: 3, side: 'tgt' as const, defaultNote: null, prevNote: null },
          rows: [{ canon: 'China', label: 'China', srcNotes: [59], defaultTgtNote: null, outcome: { status: 'dropped' as const, otherDrum: false } }],
        }}
      />,
    );
    const picker = screen.getByRole('dialog', { name: 'Target note for China' });
    expect(picker).toHaveTextContent('TARGET · China—');
  });

  const CATALOG = [
    { canon: 'kick.main', label: 'Kick', family: 'Kick' as const },
    { canon: 'snare.main', label: 'Snare', family: 'Snare' as const },
    { canon: 'ride.bell', label: 'Ride Bell', family: 'Cymbals' as const },
    { canon: 'china.1', label: 'China 1', family: 'Cymbals' as const },
    { canon: 'hat.cc', label: 'Hi-Hat CC', family: 'Hi-Hat' as const },
  ];
  const ROWS = [
    { canon: 'ride.bell', label: 'Ride Bell', srcNotes: [53], defaultTgtNote: 51, outcome: { status: 'fallback' as const, tgtNote: 51, otherDrum: false } },
    { canon: 'kick.main', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct' as const, tgtNote: 36 } },
    { canon: 'china.1', label: 'China 1', srcNotes: [52], defaultTgtNote: null, outcome: { status: 'dropped' as const, otherDrum: false } },
    { canon: 'snare.main', label: 'Snare', srcNotes: [26], defaultTgtNote: 38, outcome: { status: 'direct' as const, tgtNote: 40 } },
    { canon: 'hat.cc', label: 'Hi-Hat CC', srcNotes: [], defaultTgtNote: null, outcome: { status: 'dropped' as const, otherDrum: false } },
  ];
  const full = {
    ...editor,
    rows: ROWS,
    canonOptions: CATALOG,
    edits: { 'snare.main': 40 },
    changed: new Set(['snare.main']),
  };
  const drumNames = () =>
    screen.getAllByTestId('drum-label').map((e) => e.textContent);

  it('groups drums by family in kit order', () => {
    render(<EditView {...props} editor={full} />);
    const headings = screen.getAllByTestId('family').map((e) => e.textContent);
    expect(headings).toEqual(['Kick', 'Snare', 'Hi-Hat', 'Cymbals']);
    expect(drumNames()).toEqual(['Kick', 'Snare', 'Hi-Hat CC', 'Ride Bell', 'China 1']);
  });

  it('names the target drum each row plays', () => {
    const targetDrums = [
      { note: 36, canon: 'kick.main', label: 'EZ Kick', family: 'Kick' as const },
      { note: 51, canon: 'ride.1', label: 'Ride', family: 'Cymbals' as const },
      { note: 40, canon: 'snare.rim', label: 'Snare Rimshot', family: 'Snare' as const },
    ];
    render(<EditView {...props} editor={{ ...full, targetDrums }} />);
    const plays = (drum: string) =>
      screen.getAllByTestId('drum-label').find((e) => e.textContent === drum)!.closest('[data-row]')!
        .querySelector('[data-testid=result]')!;
    expect(screen.getAllByText('PLAYS')[0]).toBeInTheDocument();
    expect(plays('Kick')).toHaveTextContent('EZ Kick');
    expect(plays('Kick')).toHaveClass('text-t5');
    expect(plays('Snare')).toHaveTextContent('Snare Rimshot');
    expect(plays('Snare')).toHaveClass('text-t2');
    expect(plays('Ride Bell')).toHaveTextContent('≈ Ride');
    expect(plays('Ride Bell')).toHaveClass('text-star');
    expect(plays('China 1')).toHaveTextContent('dropped');
    expect(plays('China 1')).toHaveClass('text-danger');
    expect(plays('Hi-Hat CC')).toHaveTextContent('no source');
    expect(screen.getByRole('button', { name: 'C2' })).toHaveAccessibleDescription('EZ Kick');
  });

  it('falls back to the note name when no target drum sits on the note', () => {
    render(<EditView {...props} editor={{ ...full, targetDrums: [] }} />);
    const row = screen.getAllByTestId('drum-label').find((e) => e.textContent === 'Snare')!.closest('[data-row]')!;
    expect(row.querySelector('[data-testid=result]')).toHaveTextContent('E2');
  });

  it('filters to changed drums and to drums with issues', async () => {
    render(<EditView {...props} editor={full} />);
    const show = screen.getByRole('radiogroup', { name: 'Show' });
    expect(within(show).getByRole('radio', { name: 'All 5' })).toBeChecked();
    await userEvent.click(within(show).getByText('Changed 1'));
    expect(drumNames()).toEqual(['Snare']);
    await userEvent.click(within(show).getByText('Issues 2'));
    expect(drumNames()).toEqual(['Ride Bell', 'China 1']);
  });

  it('filters by drum name and says when nothing matches', async () => {
    render(<EditView {...props} editor={full} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter drums' }), 'ri');
    expect(drumNames()).toEqual(['Ride Bell']);
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter drums' }), 'zz');
    expect(screen.getByText('No drums match')).toBeInTheDocument();
  });

  it('resets a changed drum from its row', async () => {
    const resetRow = vi.fn();
    render(<EditView {...props} editor={{ ...full, resetRow }} />);
    expect(screen.queryByRole('button', { name: 'Reset Kick' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset Snare' }));
    expect(resetRow).toHaveBeenCalledWith('snare.main');
  });

  it('keeps the change count and actions in a sticky footer', async () => {
    const reset = vi.fn();
    const setView = vi.fn();
    render(<EditView {...props} setView={setView} editor={{ ...full, reset }} />);
    const footer = screen.getByRole('region', { name: 'Edit actions' });
    expect(footer).toHaveClass('sticky', 'bottom-0');
    expect(footer).toHaveTextContent('1 change');
    await userEvent.click(within(footer).getByRole('button', { name: 'Reset all' }));
    expect(reset).toHaveBeenCalledOnce();
    await userEvent.click(within(footer).getByRole('button', { name: 'Done' }));
    expect(setView).toHaveBeenCalledWith('convert');
    expect(screen.queryByText(/= remapped/)).not.toBeInTheDocument();
  });

  it('cannot reset all when nothing changed', () => {
    render(<EditView {...props} />);
    expect(screen.getByRole('button', { name: 'Reset all' })).toBeDisabled();
    expect(screen.getByRole('region', { name: 'Edit actions' })).toHaveTextContent('No changes');
  });
});
