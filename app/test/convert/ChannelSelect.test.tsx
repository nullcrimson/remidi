import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChannelSelect } from '../../src/convert/ChannelSelect';

describe('ChannelSelect', () => {
  it('shows every option with the current choice and its hint', () => {
    render(<ChannelSelect value="auto" onChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: 'Drum channel' });
    expect(select).toHaveValue('auto');
    expect(screen.getAllByRole('option')).toHaveLength(18);
    expect(screen.getByText('channel 10, or the only part with notes · otherwise you pick')).toBeInTheDocument();
    expect(select).toHaveClass('rounded-chip');
    expect(select).toHaveAccessibleDescription(/channel 10, or the only part with notes/);
  });

  it('shows the hint for a numbered channel', () => {
    render(<ChannelSelect value="10" onChange={() => {}} />);
    expect(screen.getByText('only channel 10 is converted')).toBeInTheDocument();
  });

  it('reports the picked channel', async () => {
    const onChange = vi.fn();
    render(<ChannelSelect value="auto" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Drum channel' }), '10');
    expect(onChange).toHaveBeenCalledWith('10');
  });
});
