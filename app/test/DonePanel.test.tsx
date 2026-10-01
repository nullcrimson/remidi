import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DonePanel } from '../src/components/DonePanel';

vi.mock('../src/lib/download', () => ({ saveFile: vi.fn() }));
import { saveFile } from '../src/lib/download';
import type { FailedFile } from '../src/lib/batch';
import type { FileResult } from '../src/lib/files';
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
  failures = [] as FailedFile[],
  report = view(),
  onViewReport = vi.fn(),
  onConvertMore = vi.fn(),
  onDropMissing = undefined as (() => void) | undefined,
  editedDrums = 0,
} = {}) {
  render(
    <DonePanel
      results={results}
      failures={failures}
      view={report}
      targetName="Toontrack EZdrummer 3"
      targetShort="EZD"
      from="ggd_invasion"
      to="ezdrummer"
      onViewReport={onViewReport}
      onConvertMore={onConvertMore}
      onDropMissing={onDropMissing}
      editedDrums={editedDrums}
    />,
  );
  return { onViewReport, onConvertMore };
}

describe('DonePanel', () => {
  it('offers to drop missing drums and convert again only when asked to', async () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: /Drop missing drums/ })).not.toBeInTheDocument();
    const onDropMissing = vi.fn();
    renderPanel({ onDropMissing });
    await userEvent.click(screen.getByRole('button', { name: 'Drop missing drums & convert again' }));
    expect(onDropMissing).toHaveBeenCalledOnce();
  });

  it('names the result and offers the file as the primary download', () => {
    renderPanel();
    expect(screen.getByText('1 file converted → Toontrack EZdrummer 3')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '↓ Download .mid' });
    expect(link).toHaveAttribute('href', 'blob:x');
    expect(link).toHaveAttribute('download', 'groove-ezd.mid');
    expect(link).toHaveClass('bg-accent');
  });

  it('says how many drums were edited in the heading', () => {
    renderPanel({ editedDrums: 3 });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      '1 file converted → Toontrack EZdrummer 3 · 3 drums edited',
    );
  });

  it('says one drum was edited', () => {
    renderPanel({ editedDrums: 1 });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('· 1 drum edited');
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
      failures: [{ name: 'c.mid', error: { kind: 'badMidi', detail: 'invalid midi' } }],
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
    expect(screen.getByRole('button', { name: '↓ Download 2 files (.zip)' })).toBeInTheDocument();
    const files = screen.getByRole('list', { name: 'Converted files' });
    const [a, b, c] = within(files).getAllByRole('listitem');
    expect(a).toHaveTextContent('a-ezd.mid');
    expect(a).toHaveTextContent('clean');
    expect(within(a).getByRole('link', { name: '↓ .mid' })).toHaveAttribute('href', 'blob:a');
    expect(b).toHaveTextContent('2 approx');
    expect(c).toHaveTextContent('c.mid');
    expect(c).toHaveTextContent('Not a MIDI file this converter can read Details: invalid midi');
  });

  it('keeps a single file off the per-file list', () => {
    renderPanel();
    expect(screen.queryByRole('list', { name: 'Converted files' })).not.toBeInTheDocument();
  });

  describe('tip', () => {
    const tip = () => screen.queryByRole('group', { name: 'Leave a tip' });

    it('asks only once the file is downloaded', async () => {
      renderPanel();
      expect(tip()).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('link', { name: '↓ Download .mid' }));
      expect(tip()).toBeVisible();
    });

    it('asks in plain words, without a signature', async () => {
      renderPanel();
      await userEvent.click(screen.getByRole('link', { name: '↓ Download .mid' }));
      expect(tip()).not.toHaveTextContent('null.crimson');
    });

    it('asks for a batch only once a file of it is downloaded', async () => {
      renderPanel({ results: [result('a.mid', 'blob:a'), result('b.mid', 'blob:b')] });
      expect(tip()).not.toBeInTheDocument();
      await userEvent.click(screen.getAllByRole('link', { name: '↓ .mid' })[0]);
      expect(tip()).toBeVisible();
    });

    it('offers three amounts and any other, each on its own Stripe page in a new tab', async () => {
      renderPanel();
      await userEvent.click(screen.getByRole('link', { name: '↓ Download .mid' }));
      const links = within(tip()!).getAllByRole('link');
      expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
        ['€3', 'https://buy.stripe.com/aFacN5bdV6xx5Pg8ZG6wE00'],
        ['€5', 'https://buy.stripe.com/dRm8wPdm39JJb9A2Bi6wE01'],
        ['€10', 'https://buy.stripe.com/5kQeVddm3aNN91sa3K6wE02'],
        ['Other amount', 'https://buy.stripe.com/eVq7sL81J4pp91s1xe6wE03'],
      ]);
      for (const link of links) {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener');
      }
    });

    it('marks the middle amount as the suggested one', async () => {
      renderPanel();
      await userEvent.click(screen.getByRole('link', { name: '↓ Download .mid' }));
      const [three, five, ten] = within(tip()!).getAllByRole('link');
      expect(five).toHaveClass('tip-amount-featured');
      expect(three).not.toHaveClass('tip-amount-featured');
      expect(ten).not.toHaveClass('tip-amount-featured');
    });
  });

  it('links a wrong mapping to the no-account form, naming both engines and the language', () => {
    renderPanel();
    const link = screen.getByRole('link', { name: 'Wrong mapping? Report it' });
    expect(link).toHaveAttribute('href', 'https://tally.so/r/J95eYd?from=ggd_invasion&to=ezdrummer&lang=en');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
  });

  it('opens the report and starts over', async () => {
    const { onViewReport, onConvertMore } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'View report →' }));
    await userEvent.click(screen.getByRole('button', { name: 'Convert more' }));
    expect(onViewReport).toHaveBeenCalledOnce();
    expect(onConvertMore).toHaveBeenCalledOnce();
  });

  describe('zip download', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(URL.createObjectURL).mockClear();
      vi.mocked(URL.revokeObjectURL).mockClear();
      vi.mocked(saveFile).mockClear();
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.mocked(URL.createObjectURL).mockReturnValue('blob:mock-url');
    });

    it('builds the zip only when asked, saves it and frees it afterwards', async () => {
      vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:zip-1');
      renderPanel({ results: [result('a.mid', 'blob:a'), result('b.mid', 'blob:b')] });
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: '↓ Download 2 files (.zip)' }));
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(saveFile).toHaveBeenCalledWith('blob:zip-1', 'remapped-EZD.zip');
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:zip-1');
    });

    it('does not zip a single result', () => {
      renderPanel();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /\.zip/ })).not.toBeInTheDocument();
    });
  });
});
