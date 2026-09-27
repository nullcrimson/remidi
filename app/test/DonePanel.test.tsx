import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DonePanel } from '../src/components/DonePanel';
import type { FileFailure, FileResult } from '../src/lib/files';
import type { ReportGroups, ReportView } from '../src/lib/report';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 1 };
const NONE: ReportGroups = { dropped: [], approximated: [], unrecognized: [] };

const result = (name: string, url: string): FileResult => ({
  name,
  url,
  bytes: new Uint8Array([1]),
  report: REPORT,
});

function view(overrides: Partial<ReportView['totals']> = {}, files: ReportView['files'] = []): ReportView {
  const totals = { dropped: 0, approximated: 0, unrecognized: 0, untouched: 0, converted: 45, ...overrides };
  return {
    clean: totals.converted > 0 && !totals.dropped && !totals.approximated && !totals.unrecognized,
    totals,
    groups: NONE,
    files,
  };
}

function renderPanel({
  results = [result('groove-ezd.mid', 'blob:x')],
  failures = [] as FileFailure[],
  report = view(),
  onViewReport = vi.fn(),
  onConvertMore = vi.fn(),
} = {}) {
  render(
    <DonePanel
      results={results}
      failures={failures}
      view={report}
      targetName="Toontrack EZdrummer 3"
      targetShort="EZD"
      onViewReport={onViewReport}
      onConvertMore={onConvertMore}
    />,
  );
  return { onViewReport, onConvertMore };
}

describe('DonePanel', () => {
  it('names the result and offers the file as the primary download', () => {
    renderPanel();
    expect(screen.getByText('1 file converted → Toontrack EZdrummer 3')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '↓ Download .mid' });
    expect(link).toHaveAttribute('href', 'blob:x');
    expect(link).toHaveAttribute('download', 'groove-ezd.mid');
    expect(link).toHaveClass('bg-accent');
  });

  it('tags each outcome, approximated in gold', () => {
    renderPanel({ report: view({ approximated: 3, dropped: 2, unrecognized: 51, untouched: 168 }) });
    expect(screen.getByText('45 notes converted')).toBeInTheDocument();
    expect(screen.getByText('3 approximated')).toHaveClass('text-star');
    expect(screen.getByText('2 dropped')).toHaveClass('text-danger');
    expect(screen.getByText('51 unrecognized')).toBeInTheDocument();
    expect(screen.getByText('168 on other channels unchanged')).toBeInTheDocument();
  });

  it('shows only the tags that apply', () => {
    renderPanel();
    expect(screen.getByText('45 notes converted')).toBeInTheDocument();
    expect(screen.queryByText(/approximated|dropped|unrecognized|unchanged/)).not.toBeInTheDocument();
  });

  it('says when nothing was converted', () => {
    renderPanel({ report: view({ converted: 0, untouched: 1188 }) });
    expect(screen.getByText('nothing converted')).toHaveClass('text-danger');
    expect(screen.queryByText(/notes converted/)).not.toBeInTheDocument();
  });

  it('offers a zip and lists every file of a batch, failures inline', () => {
    renderPanel({
      results: [result('a-ezd.mid', 'blob:a'), result('b-ezd.mid', 'blob:b')],
      failures: [{ name: 'c.mid', error: 'Error: not a MIDI file' }],
      report: view({ approximated: 2 }, [
        { name: 'a-ezd.mid', groups: NONE, untouched: 0, converted: 10 },
        {
          name: 'b-ezd.mid',
          groups: { ...NONE, approximated: [{ label: 'Ride Bell', sub: 'Ride', count: 2, canon: 'ride.1.bell' }] },
          untouched: 0,
          converted: 10,
        },
      ]),
    });
    expect(screen.getByText('2 files converted → Toontrack EZdrummer 3')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toHaveClass('text-danger');
    expect(screen.getByRole('link', { name: '↓ Download 2 files (.zip)' })).toHaveAttribute(
      'download',
      'remapped-EZD.zip',
    );
    const files = screen.getByRole('list', { name: 'Converted files' });
    const [a, b, c] = within(files).getAllByRole('listitem');
    expect(a).toHaveTextContent('a-ezd.mid');
    expect(a).toHaveTextContent('clean');
    expect(within(a).getByRole('link', { name: '↓ .mid' })).toHaveAttribute('href', 'blob:a');
    expect(b).toHaveTextContent('2 approx');
    expect(c).toHaveTextContent('c.mid');
    expect(c).toHaveTextContent('not a MIDI file');
  });

  it('keeps a single file off the per-file list', () => {
    renderPanel();
    expect(screen.queryByRole('list', { name: 'Converted files' })).not.toBeInTheDocument();
  });

  it('opens the report and starts over', async () => {
    const { onViewReport, onConvertMore } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'View report →' }));
    await userEvent.click(screen.getByRole('button', { name: 'Convert more' }));
    expect(onViewReport).toHaveBeenCalledOnce();
    expect(onConvertMore).toHaveBeenCalledOnce();
  });

  describe('zip object-URL lifecycle', () => {
    beforeEach(() => {
      vi.mocked(URL.createObjectURL).mockClear();
      vi.mocked(URL.revokeObjectURL).mockClear();
    });
    afterEach(() => {
      vi.mocked(URL.createObjectURL).mockReturnValue('blob:mock-url');
    });

    const batch = [result('a.mid', 'blob:a'), result('b.mid', 'blob:b')];

    it('creates one zip URL and revokes it on unmount', () => {
      vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:zip-1');
      const { rerender, unmount } = render(
        <DonePanel
          results={batch}
          failures={[]}
          view={view()}
          targetName="EZ"
          targetShort="EZD"
          onViewReport={() => {}}
          onConvertMore={() => {}}
        />,
      );
      rerender(
        <DonePanel
          results={batch}
          failures={[]}
          view={view()}
          targetName="EZ"
          targetShort="EZD"
          onViewReport={() => {}}
          onConvertMore={() => {}}
        />,
      );
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      unmount();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:zip-1');
    });

    it('does not zip a single result', () => {
      renderPanel();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
  });
});
