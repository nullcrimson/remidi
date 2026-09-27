import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportModal } from '../src/components/ReportModal';
import type { ReportView } from '../src/lib/report';

const clean: ReportView = {
  clean: true,
  totals: { dropped: 0, approximated: 0, unrecognized: 0, untouched: 0, converted: 12 },
  groups: { dropped: [], approximated: [], unrecognized: [] },
  files: [{ name: 'a.mid', groups: { dropped: [], approximated: [], unrecognized: [] }, untouched: 0 }],
};

const lossy: ReportView = {
  clean: false,
  totals: { dropped: 4, approximated: 3, unrecognized: 0, untouched: 0, converted: 12 },
  groups: {
    dropped: [{ label: 'China 1', count: 4 }],
    approximated: [{ label: 'Ride Bell', sub: 'Ride', count: 3 }],
    unrecognized: [],
  },
  files: [
    {
      name: 'a.mid',
      groups: { dropped: [{ label: 'China 1', count: 4 }], approximated: [], unrecognized: [] },
      untouched: 0,
    },
    {
      name: 'b.mid',
      groups: {
        dropped: [],
        approximated: [{ label: 'Ride Bell', sub: 'Ride', count: 3 }],
        unrecognized: [],
      },
      untouched: 0,
    },
  ],
};

const cleanWithUnchanged: ReportView = {
  ...clean,
  totals: { ...clean.totals, untouched: 170 },
  files: [
    { name: 'a.mid', groups: clean.files[0].groups, untouched: 168 },
    { name: 'b.mid', groups: clean.files[0].groups, untouched: 2 },
  ],
};

describe('ReportModal', () => {
  it('shows the clean message when nothing was lost', () => {
    render(<ReportModal open onClose={vi.fn()} view={clean} targetName="EZdrummer" />);
    expect(screen.getByText(/Clean conversion/i)).toBeInTheDocument();
    expect(screen.getByText(/EZdrummer/)).toBeInTheDocument();
  });

  it('renders grouped losses with counts and the substitute arrow', () => {
    render(<ReportModal open onClose={vi.fn()} view={lossy} targetName="EZdrummer" />);
    expect(screen.getAllByText('Ride Bell → Ride').length).toBeGreaterThan(0);
    expect(screen.getAllByText('×3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('China 1').length).toBeGreaterThan(0);
  });

  it('lists unchanged notes without losing the clean message', () => {
    render(<ReportModal open onClose={vi.fn()} view={cleanWithUnchanged} targetName="EZdrummer" />);
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
    render(<ReportModal open onClose={vi.fn()} view={none} targetName="EZdrummer" />);
    expect(screen.getByText('Nothing was converted').parentElement).toHaveTextContent(
      /no notes on the selected drum channel/,
    );
    expect(screen.queryByText(/Clean conversion/)).not.toBeInTheDocument();
  });

  it('says no drum notes were found in an empty file', () => {
    const empty: ReportView = { ...clean, clean: false, totals: { ...clean.totals, converted: 0 } };
    render(<ReportModal open onClose={vi.fn()} view={empty} targetName="EZdrummer" />);
    expect(screen.getByText('Nothing was converted').parentElement).toHaveTextContent(/no drum notes found/);
  });

  it('hides the unchanged group when every note was converted', () => {
    render(<ReportModal open onClose={vi.fn()} view={lossy} targetName="EZdrummer" />);
    expect(screen.queryByText(/Notes not converted/)).not.toBeInTheDocument();
  });

  it('renders per-file sections only for multi-file batches', () => {
    render(<ReportModal open onClose={vi.fn()} view={lossy} targetName="EZdrummer" />);
    expect(screen.getByText('a.mid')).toBeInTheDocument();
    expect(screen.getByText('b.mid')).toBeInTheDocument();
  });
});
