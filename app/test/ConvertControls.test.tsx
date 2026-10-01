import { fireEvent, render, screen } from '@testing-library/react';
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
  const blocked = (reason: string, quiet = false) => {
    render(<ConvertButton conv={{ kind: 'idle' }} blockedBy={{ reason, quiet }} onConvert={() => {}} />);
    return screen.getByRole('button', { name: 'Convert' });
  };
  const move = (el: Element, clientX: number, clientY: number, pointerType = 'mouse') =>
    fireEvent.pointerMove(el, { pointerType, clientX, clientY });

  it('disables convert and says why under it', () => {
    const button = blocked('Pick a FROM and a TO engine');
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Pick a FROM and a TO engine');
    expect(screen.getByText('Pick a FROM and a TO engine')).not.toHaveClass('sr-only');
  });

  it('keeps a quiet reason for screen readers only', () => {
    const button = blocked('Add a .mid file to convert', true);
    expect(button).toHaveAccessibleDescription('Add a .mid file to convert');
    expect(screen.getByText('Add a .mid file to convert')).toHaveClass('sr-only');
  });

  it('shows the reason next to the mouse at once and follows it', () => {
    const button = blocked('Add a .mid file to convert', true);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    move(button, 100, 50);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Add a .mid file to convert');
    expect(tip).toHaveStyle({ left: '114px', top: '68px' });
    move(button, 200, 60);
    expect(tip).toHaveStyle({ left: '214px', top: '78px' });
  });

  it('flips the tip to the left of the mouse near the right edge', () => {
    const button = blocked('Add a .mid file to convert', true);
    move(button, window.innerWidth - 10, 50);
    expect(screen.getByRole('tooltip')).toHaveStyle({ right: '24px' });
  });

  it('hides the tip when the mouse leaves', () => {
    const button = blocked('Add a .mid file to convert', true);
    move(button, 100, 50);
    fireEvent.pointerLeave(button.closest('[data-follow-tip]')!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows no tip for touch', () => {
    const button = blocked('Add a .mid file to convert', true);
    move(button, 100, 50, 'touch');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows no tip while convert can run', () => {
    render(<ConvertButton conv={{ kind: 'idle' }} blockedBy={null} onConvert={() => {}} />);
    move(screen.getByRole('button', { name: 'Convert' }), 100, 50);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('keeps the default pointer when disabled', () => {
    expect(blocked('Pick a FROM and a TO engine').className).not.toMatch(/cursor-not-allowed/);
  });

  it('is the solid primary action', () => {
    render(
      <ConvertButton
        conv={{ kind: 'idle' }}
        blockedBy={null}
        onConvert={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Convert' })).toHaveClass('bg-accent', 'w-full');
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
    await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
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
    expect(screen.queryByRole('button', { name: 'Convert' })).toBeNull();
  });
});
