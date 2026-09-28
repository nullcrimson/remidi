import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MissingDrumsSetting } from '../src/components/MissingDrumsSetting';

describe('MissingDrumsSetting', () => {
  it('shows Nearest and Drop with the current one checked, and the hint', () => {
    render(<MissingDrumsSetting value="nearest" hint="2 drums played on another drum" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Missing drums' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Nearest' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Drop' })).not.toBeChecked();
    expect(screen.getByText('2 drums played on another drum')).toBeInTheDocument();
  });

  it('reports the clicked choice', async () => {
    const onChange = vi.fn();
    render(<MissingDrumsSetting value="nearest" hint="" onChange={onChange} />);
    await userEvent.click(screen.getByText('Drop'));
    expect(onChange).toHaveBeenCalledWith('drop');
  });

  it('explains both choices and that same-drum articulations stay', () => {
    render(<MissingDrumsSetting value="drop" hint="" onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Missing drums' });
    expect(group).toHaveAccessibleDescription(/Nearest plays it on the closest drum/);
    expect(group).toHaveAccessibleDescription(/Drop leaves it out/);
    expect(group).toHaveAccessibleDescription(/Ghost notes, rimshots/);
  });
});
