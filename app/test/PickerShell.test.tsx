import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PickerShell } from '../src/components/PickerShell';

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
});
