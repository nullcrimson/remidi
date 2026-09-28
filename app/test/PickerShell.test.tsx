import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OverlayAnchor } from '../src/components/overlayAnchor';
import { PickerShell } from '../src/components/PickerShell';

function Row({ onClose }: { onClose: () => void }) {
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div ref={setRow} data-testid="row">
        <button type="button" onClick={() => setOpen(true)}>Open</button>
        <span data-testid="row-label">Kick</span>
        <OverlayAnchor value={row}>
          {open && (
            <PickerShell
              label="Target note for Kick"
              onClose={() => {
                onClose();
                setOpen(false);
              }}
            >
              <button type="button">C2</button>
            </PickerShell>
          )}
        </OverlayAnchor>
      </div>
      <p data-testid="elsewhere">elsewhere</p>
    </>
  );
}

describe('PickerShell', () => {
  it('is a bottom sheet on phones and an inline panel from sm up', () => {
    render(
      <PickerShell label="Target note for Kick" onClose={() => {}}>
        <p>body</p>
      </PickerShell>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Target note for Kick' });
    expect(dialog).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'rounded-t-card');
    expect(dialog).toHaveClass('sm:static', 'sm:rounded-panel');
    expect(dialog).toHaveTextContent('body');
  });

  it('closes when the backdrop is tapped', async () => {
    const onClose = vi.fn();
    render(
      <PickerShell label="Target note for Kick" onClose={onClose}>
        <p>body</p>
      </PickerShell>,
    );
    const backdrop = screen.getByTestId('sheet-backdrop');
    expect(backdrop).toHaveClass('sm:hidden');
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('takes focus when it opens and gives it back to the opener when it closes', async () => {
    render(<Row onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Target note for Kick' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus());
  });

  it('closes on a press outside its row, not on one inside it', async () => {
    const onClose = vi.fn();
    render(<Row onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.mouseDown(screen.getByTestId('row-label'));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'C2' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByTestId('elsewhere'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the backdrop inside its row is tapped', async () => {
    const onClose = vi.fn();
    render(<Row onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stays open when Tab moves focus out of it', async () => {
    const onClose = vi.fn();
    render(<Row onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.tab();
    await userEvent.tab();
    expect(onClose).not.toHaveBeenCalled();
  });
});
