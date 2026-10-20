import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UnrecognizedSetting } from '../../src/convert/UnrecognizedSetting';

describe('UnrecognizedSetting', () => {
  it('shows Remove and Keep as they are with the current one checked', () => {
    render(<UnrecognizedSetting value="remove" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Unknown notes' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Remove' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Keep as they are' })).not.toBeChecked();
  });

  it('says that Remove leaves the notes out', () => {
    render(<UnrecognizedSetting value="remove" onChange={() => {}} />);
    expect(screen.getByText('leave them out of the file')).toBeInTheDocument();
  });

  it('says that Keep as they are writes the notes out unchanged', () => {
    render(<UnrecognizedSetting value="keep" onChange={() => {}} />);
    expect(screen.getByText('write them out unchanged')).toBeInTheDocument();
  });

  it('reports the clicked choice', async () => {
    const onChange = vi.fn();
    render(<UnrecognizedSetting value="remove" onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Keep as they are' }));
    expect(onChange).toHaveBeenCalledWith('keep');
  });

  it('explains both choices in its tip', () => {
    render(<UnrecognizedSetting value="remove" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Unknown notes' })).toHaveAccessibleDescription(
      /Remove leaves them out of the file\. Keep as they are writes them out unchanged/,
    );
  });
});
