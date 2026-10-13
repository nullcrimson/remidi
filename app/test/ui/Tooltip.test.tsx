import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tooltip } from '../../src/ui/Tooltip';

function Fixture() {
  return (
    <Tooltip content="helpful hint">
      <button type="button">Trigger</button>
    </Tooltip>
  );
}

describe('Tooltip', () => {
  it('shows on hover', async () => {
    render(<Fixture />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await userEvent.hover(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('helpful hint');
  });

  it('hides on leave', async () => {
    render(<Fixture />);
    await userEvent.hover(screen.getByRole('button', { name: 'Trigger' }));
    await userEvent.unhover(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows on focus', async () => {
    render(<Fixture />);
    await userEvent.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    expect(trigger).toHaveAttribute('aria-describedby');
  });

  it('hides on Escape', async () => {
    render(<Fixture />);
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
