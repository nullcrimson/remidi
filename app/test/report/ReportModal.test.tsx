import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Unrecognized } from '../../src/core/midiremap';
import { ReportModal } from '../../src/report/ReportModal';
import type { ReportView } from '../../src/report/report';
import { typed } from '../typed';

const clean: ReportView = {
  clean: true,
  totals: { dropped: 0, approximated: 0, unrecognized: 0, untouched: 0, converted: 12 },
  groups: { dropped: [], approximated: [], unrecognized: [] },
  files: [{
    name: 'a.mid',
    groups: { dropped: [], approximated: [], unrecognized: [] },
    totals: { dropped: 0, approximated: 0, unrecognized: 0, untouched: 0, converted: 12 },
  }],
};

const lossy = typed<ReportView>({
  clean: false,
  totals: { dropped: 4, approximated: 3, unrecognized: 51, untouched: 0, converted: 12 },
  groups: {
    dropped: [{ label: 'China 1', count: 4, canon: 'china.1.hit' }],
    approximated: [{ label: 'Ride Bell', sub: 'Ride', count: 3, canon: 'ride.1.bell' }],
    unrecognized: [{ label: 'D#3', count: 51, note: 51 }],
  },
  files: [
    {
      name: 'a.mid',
      groups: { dropped: [{ label: 'China 1', count: 4, canon: 'china.1.hit' }], approximated: [], unrecognized: [] },
      totals: { dropped: 4, approximated: 0, unrecognized: 0, untouched: 0, converted: 6 },
    },
    {
      name: 'b.mid',
      groups: {
        dropped: [],
        approximated: [{ label: 'Ride Bell', sub: 'Ride', count: 3, canon: 'ride.1.bell' }],
        unrecognized: [],
      },
      totals: { dropped: 0, approximated: 3, unrecognized: 0, untouched: 0, converted: 6 },
    },
  ],
});

const cleanWithUnchanged: ReportView = {
  ...clean,
  totals: { ...clean.totals, untouched: 170 },
  files: [
    { name: 'a.mid', groups: clean.files[0].groups, totals: { ...clean.files[0].totals, untouched: 168, converted: 6 } },
    { name: 'b.mid', groups: clean.files[0].groups, totals: { ...clean.files[0].totals, untouched: 2, converted: 6 } },
  ],
};

function show(view: ReportView, onDropMissing?: () => void, unrecognized: Unrecognized = 'remove') {
  const handlers = { onClose: vi.fn(), onPickTarget: vi.fn(), onAssignSource: vi.fn(), onChannel: vi.fn() };
  render(
    <ReportModal
      open
      view={view}
      names={{ source: 'GGD Invasion', target: 'EZdrummer' }}
      unrecognized={unrecognized}
      onDropMissing={onDropMissing}
      {...handlers}
    />,
  );
  return handlers;
}

describe('ReportModal', () => {
  it('offers to drop missing drums and convert again once', () => {
    show(lossy, vi.fn());
    const buttons = screen.getAllByRole('button', { name: 'Drop missing drums & convert again' });
    expect(buttons).toHaveLength(1);
  });

  it('drops missing drums and converts again, then closes', async () => {
    const onDropMissing = vi.fn();
    const h = show(lossy, onDropMissing);
    const buttons = screen.getAllByRole('button', { name: 'Drop missing drums & convert again' });
    await userEvent.click(buttons[0]);
    expect(onDropMissing).toHaveBeenCalledOnce();
    expect(h.onClose).toHaveBeenCalled();
  });

  it('has no drop link unless asked to', () => {
    show(lossy);
    expect(screen.queryByRole('button', { name: /Drop missing drums/ })).not.toBeInTheDocument();
  });

  it('shows the clean message when nothing was lost', () => {
    show(clean);
    expect(screen.getByText(/Clean conversion/i)).toBeInTheDocument();
    expect(screen.getByText(/EZdrummer/)).toBeInTheDocument();
  });

  it('renders grouped losses with counts and the substitute arrow', () => {
    show(lossy);
    expect(screen.getAllByText('Ride Bell → Ride').length).toBeGreaterThan(0);
    expect(screen.getAllByText('×3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('China 1').length).toBeGreaterThan(0);
  });

  it('keeps the clean message beside unchanged notes', () => {
    show(cleanWithUnchanged);
    expect(screen.getByText(/Clean conversion/i)).toBeInTheDocument();
  });

  it('lists unchanged notes', () => {
    show(cleanWithUnchanged);
    expect(screen.getAllByText(/^Unchanged/)[0].parentElement).toHaveTextContent('Unchanged · other tracks / channels');
    expect(screen.getByText('×170')).toBeInTheDocument();
    expect(screen.getByText('a.mid')).toBeInTheDocument();
    expect(screen.getByText('×168')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('says nothing was converted when every note sat on another channel', () => {
    const none: ReportView = {
      ...cleanWithUnchanged,
      clean: false,
      totals: { ...cleanWithUnchanged.totals, converted: 0 },
    };
    show(none);
    expect(screen.getByText('Nothing was converted').parentElement).toHaveTextContent(
      /no notes on the selected drum channel/,
    );
    expect(screen.queryByText(/Clean conversion/)).not.toBeInTheDocument();
  });

  it('says no drum notes were found in an empty file', () => {
    const empty: ReportView = { ...clean, clean: false, totals: { ...clean.totals, converted: 0 } };
    show(empty);
    expect(screen.getByText('Nothing was converted').parentElement).toHaveTextContent(/no drum notes found/);
  });

  it('hides the unchanged group when every note was converted', () => {
    show(lossy);
    expect(screen.queryByText(/left as they were/)).not.toBeInTheDocument();
  });

  it('lists each file of a batch', () => {
    show(lossy);
    expect(screen.getByText('a.mid')).toBeInTheDocument();
    expect(screen.getByText('b.mid')).toBeInTheDocument();
  });

  it('has no per-file section for a single file', () => {
    show({ ...lossy, files: [lossy.files[0]] });
    expect(screen.queryByText('a.mid')).not.toBeInTheDocument();
  });

  it('shows approximated notes bright, not gold', () => {
    show(lossy);
    const approx = screen.getAllByText(/^Approximated/)[0].parentElement;
    expect(approx).toHaveClass('text-t1');
    expect(approx?.className).not.toMatch(/\btext-star/);
  });

  it('explains the approximated group', () => {
    show(lossy);
    const approx = screen.getAllByText(/^Approximated/)[0].parentElement;
    expect(approx).toHaveTextContent('played on the nearest drum');
    expect(screen.getAllByText(/played on the nearest drum/)[0]).toHaveClass('normal-case');
  });

  it('explains the dropped group', () => {
    show(lossy);
    expect(screen.getAllByText(/^Dropped/)[0].parentElement).toHaveTextContent('EZdrummer has no such drum');
  });

  it('explains the unrecognized group', () => {
    show(lossy);
    expect(screen.getAllByText(/^Unrecognized/)[0].parentElement).toHaveTextContent(
      'not in the GGD Invasion map — removed from the file',
    );
  });

  it('explains the unrecognized group as kept when the notes were kept', () => {
    show(lossy, undefined, 'keep');
    expect(screen.getAllByText(/^Unrecognized/)[0].parentElement).toHaveTextContent(
      'not in the GGD Invasion map — kept unchanged in the file',
    );
  });

  it('sends a dropped drum to its target picker and closes', async () => {
    const h = show(lossy);
    await userEvent.click(screen.getAllByRole('button', { name: 'Pick a target →' })[0]);
    expect(h.onPickTarget).toHaveBeenCalledWith('china.1.hit');
    expect(h.onClose).toHaveBeenCalledOnce();
  });

  it('sends an unrecognized note to its source assignment and closes', async () => {
    const h = show(lossy);
    await userEvent.click(screen.getAllByRole('button', { name: 'Assign →' })[0]);
    expect(h.onAssignSource).toHaveBeenCalledWith(51);
    expect(h.onClose).toHaveBeenCalledOnce();
  });

  it('explains where unchanged notes come from', () => {
    show(cleanWithUnchanged);
    expect(screen.getAllByText('Notes on other tracks or channels, left as they were')[0]).toBeInTheDocument();
  });

  it('points unchanged notes at the drum channel setting', async () => {
    const h = show(cleanWithUnchanged);
    await userEvent.click(screen.getAllByRole('button', { name: 'Drum channel →' })[0]);
    expect(h.onChannel).toHaveBeenCalledOnce();
  });
});
