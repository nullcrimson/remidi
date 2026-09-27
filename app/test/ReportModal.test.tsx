import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReportModal } from '../src/components/ReportModal';
import type { ReportView } from '../src/lib/report';

const clean: ReportView = {
  clean: true,
  totals: { dropped: 0, approximated: 0, unrecognized: 0, untouched: 0, converted: 12 },
  groups: { dropped: [], approximated: [], unrecognized: [] },
  files: [{ name: 'a.mid', groups: { dropped: [], approximated: [], unrecognized: [] }, untouched: 0, converted: 12 }],
};

const lossy: ReportView = {
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
      untouched: 0,
      converted: 6,
    },
    {
      name: 'b.mid',
      groups: {
        dropped: [],
        approximated: [{ label: 'Ride Bell', sub: 'Ride', count: 3, canon: 'ride.1.bell' }],
        unrecognized: [],
      },
      untouched: 0,
      converted: 6,
    },
  ],
};

const cleanWithUnchanged: ReportView = {
  ...clean,
  totals: { ...clean.totals, untouched: 170 },
  files: [
    { name: 'a.mid', groups: clean.files[0].groups, untouched: 168, converted: 6 },
    { name: 'b.mid', groups: clean.files[0].groups, untouched: 2, converted: 6 },
  ],
};

function show(view: ReportView) {
  const handlers = { onClose: vi.fn(), onPickTarget: vi.fn(), onAssignSource: vi.fn(), onChannel: vi.fn() };
  render(<ReportModal open view={view} targetName="EZdrummer" sourceName="GGD Invasion" {...handlers} />);
  return handlers;
}

describe('ReportModal', () => {
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

  it('lists unchanged notes without losing the clean message', () => {
    show(cleanWithUnchanged);
    expect(screen.getByText(/Clean conversion/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Unchanged/)[0]).toHaveTextContent('Unchanged · other tracks / channels');
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

  it('renders per-file sections only for multi-file batches', () => {
    show(lossy);
    expect(screen.getByText('a.mid')).toBeInTheDocument();
    expect(screen.getByText('b.mid')).toBeInTheDocument();
  });

  it('colours approximated notes gold and explains each group', () => {
    show(lossy);
    const approx = screen.getAllByText(/^Approximated/)[0];
    expect(approx).toHaveClass('text-star');
    expect(approx).toHaveTextContent('played on the nearest drum');
    expect(screen.getAllByText(/played on the nearest drum/)[0]).toHaveClass('normal-case');
    expect(screen.getAllByText(/^Dropped/)[0]).toHaveTextContent('EZdrummer has no such drum');
    expect(screen.getAllByText(/^Unrecognized/)[0]).toHaveTextContent(
      'not in the GGD Invasion map — removed from the file',
    );
  });

  it('links each fixable entry to its fix and closes', async () => {
    const h = show(lossy);
    await userEvent.click(screen.getAllByRole('button', { name: 'Pick a target →' })[0]);
    expect(h.onPickTarget).toHaveBeenCalledWith('china.1.hit');
    await userEvent.click(screen.getAllByRole('button', { name: 'Assign →' })[0]);
    expect(h.onAssignSource).toHaveBeenCalledWith(51);
    expect(screen.queryByRole('button', { name: 'Drum channel →' })).not.toBeInTheDocument();
  });

  it('points unchanged notes at the drum channel setting', async () => {
    const h = show(cleanWithUnchanged);
    expect(screen.getAllByText('Notes on other tracks or channels, left as they were')[0]).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Drum channel →' })[0]);
    expect(h.onChannel).toHaveBeenCalledOnce();
  });
});
