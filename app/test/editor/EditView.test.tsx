import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditView } from '../../src/editor/EditView';
import type { Editor, Notice, Pick as EditorPick } from '../../src/editor/useEditor';
import { vocabularyOf } from '../../src/core/canon';
import type { SavedMapping } from '../../src/presets/mappings';
import type { Canon, Drum, VocabularyDrum, VoiceRow } from '../../src/core/midiremap';
import type { Edits } from '../../src/core/overrides';
import { family_order } from '../stubs/wasm';
import { enginePair, presetName, typed } from '../typed';

const editor = typed<Editor>({
  rows: [{ canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct' as const, tgtNote: 36 } }],
  edits: {},
  srcEdits: {},
  overlay: null,
  planError: null,
  targetDrums: [],
  sourceNotes: [{ note: 24, canon: 'kick.main', label: 'Kick', family: 'Kick' as const }],
  canonOptions: [{ canon: 'kick.main', label: 'Kick', family: 'Kick' as const }],
  vocabulary: vocabularyOf(typed<VocabularyDrum[]>([{ canon: 'kick.main', label: 'Kick', family: 'Kick' }])),
  families: family_order(),
  remappedCount: 0,
  changed: new Set<Canon>(),
  changedSrc: new Set<Canon>(),
  resetRow: vi.fn(),
  beginSession: vi.fn(),
  countPick: vi.fn(),
  countFilter: vi.fn(),
  endSession: vi.fn(),
  openPick: vi.fn(),
  openSrcPick: vi.fn(),
  setPickOct: vi.fn(),
  chooseNote: vi.fn(),
  chooseSrcNote: vi.fn(),
  setSrcCanon: vi.fn(),
  clearSrcCanon: vi.fn(),
  closePick: vi.fn(),
  reset: vi.fn(),
  load: vi.fn(),
  onSelection: vi.fn(),
});

const props = {
  editor,
  pair: enginePair('ggd_invasion', 'ezdrummer'),
  srcName: 'GGD Invasion',
  tgtName: 'EZdrummer 3',
  oct: 'c1' as const,
  existingPreset: undefined,
  presetsAtCap: false,
  presetsUnsaved: false,
  assignNote: null,
  initialShow: 'all' as const,
  onClose: vi.fn(),
  onSavePreset: vi.fn(),
  onUpdatePreset: vi.fn(),
};

const rowOfDrum = (drum: string) =>
  screen.getAllByTestId('drum-label').find((e) => e.textContent === drum)!.closest<HTMLElement>('[data-row]')!;

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
        editor={{ ...editor, overlay: typed<Notice>({ kind: 'notice', canon: 'KickMain', note: 26, from: 'Snare' }) }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('D1 was Snare — now plays Kick');
  });

  it('renders rows', () => {
    render(<EditView {...props} />);
    expect(screen.getAllByText('Kick')).toHaveLength(2);
    expect(screen.getByText('GGD Invasion → EZdrummer 3')).toBeInTheDocument();
  });

  it('returns to convert view', async () => {
    const onClose = vi.fn();
    render(<EditView {...props} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onClose).toHaveBeenCalledOnce();
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
        editor={{ ...editor, overlay: typed<EditorPick>({ kind: 'tgt', canon: 'KickMain', octIndex: 2, defaultNote: null }) }}
      />,
    );
    expect(screen.getByRole('dialog', { name: /Target note for Kick/i })).toBeInTheDocument();
  });

  it('shows the source picker dialog when a row source is the active pick', () => {
    render(
      <EditView
        {...props}
        editor={{ ...editor, overlay: typed<EditorPick>({ kind: 'src', canon: 'KickMain', octIndex: 2, prevNote: 24 }) }}
      />,
    );
    expect(screen.getByRole('dialog', { name: /Source note for Kick/i })).toBeInTheDocument();
  });

  it('reveals the advanced source editor on demand', async () => {
    render(<EditView {...props} />);
    expect(screen.queryByLabelText('Add source note')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Advanced/i }));
    expect(screen.getByLabelText('Add source note')).toBeInTheDocument();
  });

  it('shows the advanced toggle as a full-width row', () => {
    render(<EditView {...props} />);
    const toggle = screen.getByRole('button', { name: /Advanced/i });
    expect(toggle).toHaveClass('w-full', 'rounded-panel', 'border');
  });

  it('turns the chevron of the advanced toggle when it opens', async () => {
    render(<EditView {...props} />);
    const toggle = screen.getByRole('button', { name: /Advanced/i });
    const chevron = toggle.querySelector('[aria-hidden="true"]');
    expect(chevron).not.toHaveClass('rotate-180');
    await userEvent.click(toggle);
    expect(chevron).toHaveClass('rotate-180');
  });

  it('saves a new preset with the prefilled pair name', async () => {
    const onSavePreset = vi.fn();
    render(
      <EditView {...props} editor={{ ...editor, edits: typed<Edits>({ KickMain: 40 }) }} onSavePreset={onSavePreset} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save as preset' }));
    expect(screen.getByLabelText('Preset name')).toHaveValue('GGD→EZD');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSavePreset).toHaveBeenCalledWith('GGD→EZD');
  });

  it('updates an existing preset for the same pair', async () => {
    const onUpdatePreset = vi.fn();
    const existingPreset = typed<SavedMapping>({
      id: 'p1',
      name: presetName('mine'),
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: {},
      srcEdits: {},
      updatedAt: 1,
    });
    render(
      <EditView
        {...props}
        editor={{ ...editor, edits: typed<Edits>({ KickMain: 40 }) }}
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
          changedSrc: new Set(typed<Canon[]>(['KickMain'])),
          rows: typed<VoiceRow[]>([{ canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [], defaultTgtNote: 36, outcome: { status: 'direct' as const, tgtNote: 36 } }]),
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
          canonOptions: typed<VocabularyDrum[]>([{ canon: 'China', label: 'China', family: 'Cymbals' }]),
          overlay: typed<EditorPick>({ kind: 'tgt', canon: 'China', octIndex: 3, defaultNote: null }),
          rows: typed<VoiceRow[]>([{ canon: 'China', label: 'China', family: 'Cymbals', srcNotes: [59], defaultTgtNote: null, outcome: { status: 'dropped' as const, otherDrum: false } }]),
        }}
      />,
    );
    const picker = screen.getByRole('dialog', { name: 'Target note for China' });
    expect(picker).toHaveTextContent('TARGET · China—');
  });

  const CATALOG = typed<VocabularyDrum[]>([
    { canon: 'kick.main', label: 'Kick', family: 'Kick' as const },
    { canon: 'snare.main', label: 'Snare', family: 'Snare' as const },
    { canon: 'ride.bell', label: 'Ride Bell', family: 'Cymbals' as const },
    { canon: 'china.1', label: 'China 1', family: 'Cymbals' as const },
    { canon: 'hat.cc', label: 'Hi-Hat CC', family: 'Hi-Hat' as const },
  ]);
  const ROWS = typed<VoiceRow[]>([
    { canon: 'ride.bell', label: 'Ride Bell', family: 'Cymbals', srcNotes: [53], defaultTgtNote: 51, outcome: { status: 'fallback' as const, standIn: 'ride.1', tgtNote: 51, otherDrum: false } },
    { canon: 'kick.main', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct' as const, tgtNote: 36 } },
    { canon: 'china.1', label: 'China 1', family: 'Cymbals', srcNotes: [52], defaultTgtNote: null, outcome: { status: 'dropped' as const, otherDrum: false } },
    { canon: 'snare.main', label: 'Snare', family: 'Snare', srcNotes: [26], defaultTgtNote: 38, outcome: { status: 'direct' as const, tgtNote: 40 } },
    { canon: 'hat.cc', label: 'Hi-Hat CC', family: 'Hi-Hat', srcNotes: [], defaultTgtNote: null, outcome: { status: 'dropped' as const, otherDrum: false } },
  ]);
  const full = {
    ...editor,
    rows: ROWS,
    canonOptions: CATALOG,
    edits: typed<Edits>({ 'snare.main': 40 }),
    changed: new Set(typed<Canon[]>(['snare.main'])),
  };
  const drumNames = () =>
    screen.getAllByTestId('drum-label').map((e) => e.textContent);

  it('groups drums by family in kit order', () => {
    render(<EditView {...props} editor={full} />);
    const headings = screen.getAllByTestId('family').map((e) => e.textContent);
    expect(headings).toEqual(['Kick', 'Snare', 'Hi-Hat', 'Cymbals']);
    expect(drumNames()).toEqual(['Kick', 'Snare', 'Hi-Hat CC', 'Ride Bell', 'China 1']);
  });

  describe('naming the target drum each row plays', () => {
    const targetDrums = typed<Drum[]>([
      { note: 36, canon: 'kick.main', label: 'EZ Kick', family: 'Kick' as const },
      { note: 51, canon: 'ride.1', label: 'Ride', family: 'Cymbals' as const },
      { note: 40, canon: 'snare.rim', label: 'Snare Rimshot', family: 'Snare' as const },
    ]);
    const plays = (drum: string) => within(rowOfDrum(drum)).getByTestId('result');

    const renderWithTargetDrums = () => render(<EditView {...props} editor={{ ...full, targetDrums }} />);

    it('labels the result column PLAYS', () => {
      renderWithTargetDrums();
      expect(screen.getAllByText('PLAYS')[0]).toBeInTheDocument();
    });

    it('names the drum a direct row plays', () => {
      renderWithTargetDrums();
      expect(plays('Kick')).toHaveTextContent('EZ Kick');
      expect(plays('Kick')).toHaveClass('text-t5');
    });

    it('names the drum an edited row plays', () => {
      renderWithTargetDrums();
      expect(plays('Snare')).toHaveTextContent('Snare Rimshot');
      expect(plays('Snare')).toHaveClass('text-t2');
    });

    it('marks a fallback row with its approximate drum', () => {
      renderWithTargetDrums();
      expect(plays('Ride Bell')).toHaveTextContent('≈ Ride');
      expect(plays('Ride Bell')).toHaveClass('text-star');
    });

    it('names the stand-in the converter chose, then the stock drum on the note an edit gave it', () => {
      const standInMoved = typed<VoiceRow[]>([
        { canon: 'ride.bell', label: 'Ride Bell', family: 'Cymbals', srcNotes: [53], defaultTgtNote: 51, outcome: { status: 'fallback', standIn: 'snare.rim', tgtNote: 51, otherDrum: true } },
      ]);
      render(<EditView {...props} editor={{ ...full, targetDrums, rows: standInMoved }} />);
      expect(plays('Ride Bell').textContent).toBe('≈ Snare Rimshot → Ride');
    });

    it('explains a moved stand-in when the mouse is over its line', async () => {
      const standInMoved = typed<VoiceRow[]>([
        { canon: 'ride.bell', label: 'Ride Bell', family: 'Cymbals', srcNotes: [53], defaultTgtNote: 51, outcome: { status: 'fallback', standIn: 'snare.rim', tgtNote: 51, otherDrum: true } },
      ]);
      render(<EditView {...props} editor={{ ...full, targetDrums, rows: standInMoved }} />);
      await userEvent.hover(screen.getByText('≈ Snare Rimshot → Ride'));
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'EZdrummer 3 has no Ride Bell, so Snare Rimshot plays it. Your edit sends Snare Rimshot to Ride. Click to go to Snare Rimshot.',
      );
    });

    const causeAndEffect = typed<VoiceRow[]>([
      { canon: 'ride.bell', label: 'Ride Bell', family: 'Cymbals', srcNotes: [53], defaultTgtNote: 51, outcome: { status: 'fallback', standIn: 'snare.rim', tgtNote: 51, otherDrum: true } },
      { canon: 'snare.rim', label: 'Snare Rimshot', family: 'Snare', srcNotes: [40], defaultTgtNote: 40, outcome: { status: 'direct', tgtNote: 51 } },
    ]);
    const targetChip = (drum: string) => within(rowOfDrum(drum)).getAllByRole('button', { expanded: false })[1];

    it('puts focus on the target note of the stand-in when its moved line is clicked', async () => {
      render(<EditView {...props} editor={{ ...full, targetDrums, rows: causeAndEffect }} />);
      await userEvent.click(screen.getByRole('button', { name: '≈ Snare Rimshot → Ride' }));
      expect(targetChip('Snare Rimshot')).toHaveFocus();
    });

    it('marks the stand-in\'s row for a highlight when its moved line is clicked', async () => {
      render(<EditView {...props} editor={{ ...full, targetDrums, rows: causeAndEffect }} />);
      await userEvent.click(screen.getByRole('button', { name: '≈ Snare Rimshot → Ride' }));
      expect(rowOfDrum('Snare Rimshot')).toHaveAttribute('data-flash');
    });

    it('takes the mark off the row once its highlight has faded', async () => {
      render(<EditView {...props} editor={{ ...full, targetDrums, rows: causeAndEffect }} />);
      await userEvent.click(screen.getByRole('button', { name: '≈ Snare Rimshot → Ride' }));
      fireEvent.animationEnd(rowOfDrum('Snare Rimshot'));
      expect(rowOfDrum('Snare Rimshot')).not.toHaveAttribute('data-flash');
    });

    it('leaves the row that was clicked without a highlight', async () => {
      render(<EditView {...props} editor={{ ...full, targetDrums, rows: causeAndEffect }} />);
      await userEvent.click(screen.getByRole('button', { name: '≈ Snare Rimshot → Ride' }));
      expect(rowOfDrum('Ride Bell')).not.toHaveAttribute('data-flash');
    });

    it('shows the stand-in\'s row again when a filter hid it and its moved line is clicked', async () => {
      render(<EditView {...props} initialShow="issues" editor={{ ...full, targetDrums, rows: causeAndEffect }} />);
      await userEvent.click(screen.getByRole('button', { name: '≈ Snare Rimshot → Ride' }));
      expect(targetChip('Snare Rimshot')).toHaveFocus();
    });

    it('shows all drums once a moved line brought back a row the filter hid', async () => {
      render(<EditView {...props} initialShow="issues" editor={{ ...full, targetDrums, rows: causeAndEffect }} />);
      await userEvent.click(screen.getByRole('button', { name: '≈ Snare Rimshot → Ride' }));
      expect(screen.getByRole('radio', { name: /^All/ })).toBeChecked();
    });

    it('keeps the filter when the stand-in\'s row is already shown', async () => {
      render(<EditView {...props} initialShow="changed" editor={{ ...full, targetDrums, rows: causeAndEffect, changed: new Set(typed<Canon[]>(['ride.bell', 'snare.rim'])) }} />);
      await userEvent.click(screen.getByRole('button', { name: 'Snare Rimshot → Ride' }));
      expect(screen.getByRole('radio', { name: /^Changed/ })).toBeChecked();
    });

    it('gives a stand-in on its own note no explanation to hover', async () => {
      renderWithTargetDrums();
      await userEvent.hover(plays('Ride Bell'));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('says a dropped row is dropped', () => {
      renderWithTargetDrums();
      expect(plays('China 1')).toHaveTextContent('dropped');
      expect(plays('China 1')).toHaveClass('text-danger');
    });

    it('says a row without a source note has no source', () => {
      renderWithTargetDrums();
      expect(plays('Hi-Hat CC')).toHaveTextContent('no source');
    });

    it('describes a target note chip by the drum on it', () => {
      renderWithTargetDrums();
      expect(screen.getByRole('button', { name: 'C2' })).toHaveAccessibleDescription('EZ Kick');
    });
  });

  it('falls back to the note name when no target drum sits on the note', () => {
    render(<EditView {...props} editor={{ ...full, targetDrums: [] }} />);
    expect(within(rowOfDrum('Snare')).getByTestId('result')).toHaveTextContent('E2');
  });

  it('filters to changed drums', async () => {
    render(<EditView {...props} editor={full} />);
    const show = screen.getByRole('radiogroup', { name: 'Show' });
    expect(within(show).getByRole('radio', { name: 'All 5' })).toBeChecked();
    await userEvent.click(within(show).getByText('Changed 1'));
    expect(drumNames()).toEqual(['Snare']);
  });

  it('filters to drums with issues', async () => {
    render(<EditView {...props} editor={full} />);
    const show = screen.getByRole('radiogroup', { name: 'Show' });
    await userEvent.click(within(show).getByText('Issues 2'));
    expect(drumNames()).toEqual(['Ride Bell', 'China 1']);
  });

  it('filters by drum name', async () => {
    render(<EditView {...props} editor={full} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter drums' }), 'ri');
    expect(drumNames()).toEqual(['Ride Bell']);
  });

  it('says when no drum matches the filter', async () => {
    render(<EditView {...props} editor={full} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter drums' }), 'ri');
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

  it('keeps the change count in a sticky footer', () => {
    render(<EditView {...props} editor={full} />);
    const footer = screen.getByRole('region', { name: 'Edit actions' });
    expect(footer).toHaveClass('sticky', 'bottom-0');
    expect(footer).toHaveTextContent('1 change');
    expect(screen.queryByText(/= remapped/)).not.toBeInTheDocument();
  });

  it('resets all edits from the footer', async () => {
    const reset = vi.fn();
    render(<EditView {...props} editor={{ ...full, reset }} />);
    const footer = screen.getByRole('region', { name: 'Edit actions' });
    await userEvent.click(within(footer).getByRole('button', { name: 'Reset all' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('closes from Done in the footer', async () => {
    const onClose = vi.fn();
    render(<EditView {...props} onClose={onClose} editor={full} />);
    const footer = screen.getByRole('region', { name: 'Edit actions' });
    await userEvent.click(within(footer).getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cannot reset all when nothing changed', () => {
    render(<EditView {...props} />);
    expect(screen.getByRole('button', { name: 'Reset all' })).toBeDisabled();
    expect(screen.getByRole('region', { name: 'Edit actions' })).toHaveTextContent('No changes');
  });
});
