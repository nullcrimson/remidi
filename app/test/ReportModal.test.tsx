import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportModal } from '../src/components/ReportModal';
import type { ReportView } from '../src/lib/report';

const clean: ReportView = {
  clean: true,
  totals: { dropped: 0, approximated: 0, unrecognized: 0 },
  groups: { dropped: [], approximated: [], unrecognized: [] },
  files: [{ name: 'a.mid', groups: { dropped: [], approximated: [], unrecognized: [] } }],
};

const lossy: ReportView = {
  clean: false,
  totals: { dropped: 4, approximated: 3, unrecognized: 0 },
  groups: {
    dropped: [{ label: 'China 1', count: 4 }],
    approximated: [{ label: 'Ride Bell', sub: 'Ride', count: 3 }],
    unrecognized: [],
  },
  files: [
    {
      name: 'a.mid',
      groups: { dropped: [{ label: 'China 1', count: 4 }], approximated: [], unrecognized: [] },
    },
    {
      name: 'b.mid',
      groups: {
        dropped: [],
        approximated: [{ label: 'Ride Bell', sub: 'Ride', count: 3 }],
        unrecognized: [],
      },
    },
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

  it('renders per-file sections only for multi-file batches', () => {
    render(<ReportModal open onClose={vi.fn()} view={lossy} targetName="EZdrummer" />);
    expect(screen.getByText('a.mid')).toBeInTheDocument();
    expect(screen.getByText('b.mid')).toBeInTheDocument();
  });
});
