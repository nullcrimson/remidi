import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OctaveToggle } from '../src/components/OctaveToggle';

describe('OctaveToggle', () => {
  it('shows the current base and its DAWs', () => {
    render(<OctaveToggle value="c1" onToggle={() => {}} />);
    expect(screen.getByText('C-1')).toBeInTheDocument();
    expect(screen.getByText(/Reaper/)).toBeInTheDocument();
  });

  it('shows c2 DAWs', () => {
    render(<OctaveToggle value="c2" onToggle={() => {}} />);
    expect(screen.getByText('C-2')).toBeInTheDocument();
    expect(screen.getByText(/Cubase/)).toBeInTheDocument();
  });

  it('toggles on click', async () => {
    const onToggle = vi.fn();
    render(<OctaveToggle value="c1" onToggle={onToggle} />);
    await userEvent.click(screen.getByText('C-1'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
