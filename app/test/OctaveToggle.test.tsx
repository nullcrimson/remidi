import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OctaveToggle } from '../src/components/OctaveToggle';

describe('OctaveToggle', () => {
  it('shows both bases with the current one checked, and its DAWs', () => {
    render(<OctaveToggle value="c1" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Octaves start at' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'C-1' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'C-2' })).not.toBeChecked();
    expect(screen.getByText(/Reaper/)).toBeInTheDocument();
  });

  it('shows c2 DAWs', () => {
    render(<OctaveToggle value="c2" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'C-2' })).toBeChecked();
    expect(screen.getByText(/Cubase/)).toBeInTheDocument();
  });

  it('reports the clicked base', async () => {
    const onChange = vi.fn();
    render(<OctaveToggle value="c1" onChange={onChange} />);
    await userEvent.click(screen.getByText('C-2'));
    expect(onChange).toHaveBeenCalledWith('c2');
  });

  it('switches with the arrow keys', async () => {
    const onChange = vi.fn();
    render(<OctaveToggle value="c1" onChange={onChange} />);
    screen.getByRole('radio', { name: 'C-1' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('c2');
  });

  it('wears the chip, with the checked base on', () => {
    render(<OctaveToggle value="c2" onChange={() => {}} />);
    expect(screen.getByText('C-2').closest('label')).toHaveClass('rounded-chip', 'bg-accent/15');
    expect(screen.getByText('C-1').closest('label')).not.toHaveClass('bg-accent/15');
  });

  it('has no separate switch button', () => {
    render(<OctaveToggle value="c1" onChange={() => {}} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
