import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConvertButton } from '../src/components/ConvertButton';
import { SummaryRow } from '../src/components/SummaryRow';

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
        conv="idle"
        canConvert={false}
        downloadUrl={null}
        downloadName=""
        summary=""
        onConvert={() => {}}
        onReset={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Convert & download/i })).toBeDisabled();
  });

  it('fires convert when enabled', async () => {
    const onConvert = vi.fn();
    render(
      <ConvertButton
        conv="idle"
        canConvert
        downloadUrl={null}
        downloadName=""
        summary=""
        onConvert={onConvert}
        onReset={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Convert & download/i }));
    expect(onConvert).toHaveBeenCalledOnce();
  });

  it('renders a download link when done', () => {
    render(
      <ConvertButton
        conv="done"
        canConvert
        downloadUrl="blob:x"
        downloadName="groove-ezdrummer.mid"
        summary="3 remapped · 11 kept → ezdrummer"
        onConvert={() => {}}
        onReset={() => {}}
      />,
    );
    const link = screen.getByRole('link', { name: /download .mid/i });
    expect(link).toHaveAttribute('href', 'blob:x');
    expect(link).toHaveAttribute('download', 'groove-ezdrummer.mid');
  });
});
