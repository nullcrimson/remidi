import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SettingRow } from '../src/components/SettingRow';

function Fixture() {
  return (
    <SettingRow label="Mode" tipTitle="What mode does" tip="It picks the mode." hint="fast">
      {({ labelledBy, describedBy }) => (
        <button type="button" aria-labelledby={labelledBy} aria-describedby={describedBy}>
          x
        </button>
      )}
    </SettingRow>
  );
}

describe('SettingRow', () => {
  it('opens the tip from the dotted label, not the control', async () => {
    render(<Fixture />);
    const label = screen.getByText('Mode');
    expect(label).toHaveClass('cursor-help', 'border-dotted');
    await userEvent.hover(screen.getByRole('button', { name: 'Mode' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await userEvent.hover(label);
    expect(screen.getByRole('tooltip')).toHaveTextContent('It picks the mode.');
  });

  it('describes the control with the hint and the tip', () => {
    render(<Fixture />);
    const control = screen.getByRole('button', { name: 'Mode' });
    expect(control).toHaveAccessibleDescription(/fast/);
    expect(control).toHaveAccessibleDescription(/It picks the mode\./);
  });
});
