import { render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('wraps Shift+Tab from the first control to the last', async () => {
    setup();
    screen.getByRole('button', { name: 'Close' }).focus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
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
    await userEvent.click(screen.getByRole('button', { name: 'Count 0' }));
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
});
