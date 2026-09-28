import { render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '../src/components/Modal';

function setup() {
  render(
    <>
      <button type="button">Behind</button>
      <Modal open heading="Report" onClose={vi.fn()}>
        <a href="#issue">Issue</a>
        <button type="button">Last</button>
      </Modal>
    </>,
  );
}

describe('Modal', () => {
  it('keeps Tab inside the dialog', async () => {
    setup();
    screen.getByRole('button', { name: 'Last' }).focus();
    await userEvent.tab();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());
  });

  it('wraps Shift+Tab from the first control to the last', async () => {
    setup();
    screen.getByRole('button', { name: 'Close' }).focus();
    await userEvent.tab({ shift: true });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus());
  });

  it('keeps focus on a control inside when the parent re-renders with a new onClose', async () => {
    function Parent() {
      const [n, setN] = useState(0);
      return (
        <Modal open heading="Report" onClose={() => setN(n)}>
          <button type="button" onClick={() => setN((x) => x + 1)}>
            Count {n}
          </button>
        </Modal>
      );
    }
    render(<Parent />);
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Report' })).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: 'Count 0' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Count 1' })).toHaveFocus();
  });

  it('still closes on Escape with the latest onClose', async () => {
    const calls: number[] = [];
    function Parent() {
      const [n, setN] = useState(0);
      return (
        <Modal open heading="Report" onClose={() => calls.push(n)}>
          <button type="button" onClick={() => setN((x) => x + 1)}>
            Count {n}
          </button>
        </Modal>
      );
    }
    render(<Parent />);
    await userEvent.click(screen.getByRole('button', { name: 'Count 0' }));
    await userEvent.keyboard('{Escape}');
    expect(calls).toEqual([1]);
  });

  it('closes on Escape or the backdrop and gives focus back to what opened it', async () => {
    function Parent() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open report</button>
          <Modal open={open} heading="Report" onClose={() => setOpen(false)}>
            <p>body</p>
          </Modal>
        </>
      );
    }
    render(<Parent />);
    await userEvent.click(screen.getByRole('button', { name: 'Open report' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Report' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open report' })).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: 'Open report' }));
    await userEvent.click(screen.getByTestId('modal-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps its content in the page, hidden, while closed', () => {
    render(
      <Modal open={false} heading="Report" onClose={vi.fn()}>
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByText('body')).not.toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
