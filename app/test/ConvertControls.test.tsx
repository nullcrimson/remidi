import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConvertButton } from '../src/components/ConvertButton';
import { SummaryRow } from '../src/components/SummaryRow';

const REPORT = { unmappedSource: {}, fallbackUsed: {}, dropped: {} };

type Res = { name: string; url: string; bytes: Uint8Array; report: typeof REPORT };
const done = (results: Res[]) => ({ kind: 'done' as const, results, failures: [] });

describe('SummaryRow', () => {
  it('shows counts and fires edit', async () => {
    const onEdit = vi.fn();
    render(<SummaryRow remapped={3} total={14} onEdit={onEdit} />);
    expect(screen.getByText(/of 14 drums remapped/)).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Edit individual notes/));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});

describe('ConvertButton', () => {
  it('disables convert without a file', () => {
    render(
      <ConvertButton
        conv={{ kind: 'idle' }}
        canConvert={false}
        targetShort=""
        summary=""
        onConvert={() => {}}
        onReset={() => {}}
        onViewReport={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Convert & download/i })).toBeDisabled();
  });

  it('fires convert when enabled', async () => {
    const onConvert = vi.fn();
    render(
      <ConvertButton
        conv={{ kind: 'idle' }}
        canConvert
        targetShort=""
        summary=""
        onConvert={onConvert}
        onReset={() => {}}
        onViewReport={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Convert & download/i }));
    expect(onConvert).toHaveBeenCalledOnce();
  });

  it('shows progress while running', () => {
    render(
      <ConvertButton
        conv={{ kind: 'running' }}
        canConvert
        targetShort="EZD"
        summary=""
        onConvert={() => {}}
        onReset={() => {}}
        onViewReport={() => {}}
      />,
    );
    expect(screen.getByText(/remapping/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Convert & download/i })).toBeNull();
  });

  it('renders a single .mid link for one result', () => {
    render(
      <ConvertButton
        conv={done([{ name: 'groove-ezd.mid', url: 'blob:x', bytes: new Uint8Array([1]), report: REPORT }])}
        canConvert
        targetShort="EZD"
        summary="1 file · 3 remapped → EZD"
        onConvert={() => {}}
        onReset={() => {}}
        onViewReport={() => {}}
      />,
    );
    const link = screen.getByRole('link', { name: /download .mid/i });
    expect(link).toHaveAttribute('href', 'blob:x');
    expect(link).toHaveAttribute('download', 'groove-ezd.mid');
  });

  it('opens the report via the View report link', async () => {
    const onViewReport = vi.fn();
    render(
      <ConvertButton
        conv={done([{ name: 'groove-ezd.mid', url: 'blob:x', bytes: new Uint8Array([1]), report: REPORT }])}
        canConvert
        targetShort="EZD"
        summary="1 file · 3 remapped → EZD"
        onConvert={() => {}}
        onReset={() => {}}
        onViewReport={onViewReport}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /View report/i }));
    expect(onViewReport).toHaveBeenCalledOnce();
  });

  it('renders a zip link for multiple results', () => {
    render(
      <ConvertButton
        conv={done([
          { name: 'a.mid', url: 'blob:a', bytes: new Uint8Array([1]), report: REPORT },
          { name: 'b.mid', url: 'blob:b', bytes: new Uint8Array([2]), report: REPORT },
        ])}
        canConvert
        targetShort="EZD"
        summary="2 files · 6 remapped → EZD"
        onConvert={() => {}}
        onReset={() => {}}
        onViewReport={() => {}}
      />,
    );
    expect(screen.getByRole('link', { name: /download all \(\.zip\)/i })).toHaveAttribute(
      'download',
      'remapped-EZD.zip',
    );
  });

  describe('zip object-URL lifecycle', () => {
    beforeEach(() => {
      vi.mocked(URL.createObjectURL).mockClear();
      vi.mocked(URL.revokeObjectURL).mockClear();
    });
    afterEach(() => {
      vi.mocked(URL.createObjectURL).mockReturnValue('blob:mock-url');
    });

    const multi = done([
      { name: 'a.mid', url: 'blob:a', bytes: new Uint8Array([1]), report: REPORT },
      { name: 'b.mid', url: 'blob:b', bytes: new Uint8Array([2]), report: REPORT },
    ]);

    it('creates one zip URL per render pass, not one per render', () => {
      const { rerender } = render(
        <ConvertButton
          conv={multi}
          canConvert
          targetShort="EZD"
          summary="2 files"
          onConvert={() => {}}
          onReset={() => {}}
        onViewReport={() => {}}
        />,
      );
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      rerender(
        <ConvertButton
          conv={multi}
          canConvert
          targetShort="EZD"
          summary="2 files (rerendered)"
          onConvert={() => {}}
          onReset={() => {}}
        onViewReport={() => {}}
        />,
      );
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it('revokes the zip URL on unmount', () => {
      vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:zip-1');
      const { unmount } = render(
        <ConvertButton
          conv={multi}
          canConvert
          targetShort="EZD"
          summary="2 files"
          onConvert={() => {}}
          onReset={() => {}}
        onViewReport={() => {}}
        />,
      );
      unmount();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:zip-1');
    });

    it('does not create a zip URL for a single result', () => {
      render(
        <ConvertButton
          conv={done([{ name: 'a.mid', url: 'blob:a', bytes: new Uint8Array([1]), report: REPORT }])}
          canConvert
          targetShort="EZD"
          summary="1 file"
          onConvert={() => {}}
          onReset={() => {}}
        onViewReport={() => {}}
        />,
      );
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
  });
});
