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
        conv={{ kind: 'idle' }}
        blockedBy="Add a .mid file to convert"
        onConvert={() => {}}
      />,
    );
    const button = screen.getByRole('button', { name: /Convert & download/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Add a .mid file to convert');
  });

  it('is the solid primary action', () => {
    render(
      <ConvertButton
        conv={{ kind: 'idle' }}
        blockedBy={null}
        onConvert={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Convert & download/i })).toHaveClass('bg-accent', 'w-full');
  });

  it('fires convert when enabled', async () => {
    const onConvert = vi.fn();
    render(
      <ConvertButton
        conv={{ kind: 'idle' }}
        blockedBy={null}
        onConvert={onConvert}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Convert & download/i }));
    expect(onConvert).toHaveBeenCalledOnce();
  });

  it('shows progress while running', () => {
    render(
      <ConvertButton
        conv={{ kind: 'running' }}
        blockedBy={null}
        onConvert={() => {}}
      />,
    );
    expect(screen.getByText(/remapping/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Convert & download/i })).toBeNull();
  });
});
