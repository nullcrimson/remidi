import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tooltip } from '../src/components/Tooltip';

function Fixture() {
  return (
    <Tooltip content="helpful hint">
      <button type="button">Trigger</button>
    </Tooltip>
  );
}

describe('Tooltip', () => {
  it('shows on hover and hides on leave', async () => {
    render(<Fixture />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await userEvent.hover(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('helpful hint');
    await userEvent.unhover(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows on focus and hides on Escape', async () => {
    render(<Fixture />);
    await userEvent.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    expect(trigger).toHaveAttribute('aria-describedby');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
