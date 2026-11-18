import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilePicker } from '../../src/convert/FilePicker';

describe('FilePicker', () => {
  it('is a button named by what it shows', () => {
    render(<FilePicker onPick={vi.fn()}>choose</FilePicker>);
    expect(screen.getByRole('button', { name: 'choose' })).toHaveAttribute('type', 'button');
  });

  it('asks for the file input when pressed', async () => {
    const onPick = vi.fn();
    render(<FilePicker onPick={onPick}>choose</FilePicker>);
    await userEvent.click(screen.getByRole('button', { name: 'choose' }));
    expect(onPick).toHaveBeenCalledOnce();
  });

  it('spans its row unless told not to', () => {
    const { rerender } = render(<FilePicker onPick={vi.fn()}>choose</FilePicker>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
    rerender(<FilePicker onPick={vi.fn()} fullWidth={false}>choose</FilePicker>);
    expect(screen.getByRole('button')).not.toHaveClass('w-full');
  });
});
