import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChannelSelect } from '../src/components/ChannelSelect';

describe('ChannelSelect', () => {
  it('shows every option with the current choice and its hint', () => {
    render(<ChannelSelect value="auto" onChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: 'Drum channel' });
    expect(select).toHaveValue('auto');
    expect(screen.getAllByRole('option')).toHaveLength(18);
    expect(screen.getByText('tracks with channel-10 hits · others unchanged')).toBeInTheDocument();
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
