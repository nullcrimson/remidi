import { render, screen } from '@testing-library/react';
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
});
