import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryList } from '../src/components/LibraryList';

const engines = [
  { id: 'ggd_invasion', name: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer' },
];

describe('LibraryList', () => {
  it('marks the selected engine pressed', () => {
    render(<LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'GGD Invasion' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'EZdrummer' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('emits the chosen id', async () => {
    const onChange = vi.fn();
    render(<LibraryList label="TO" value="ggd_invasion" engines={engines} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'EZdrummer' }));
    expect(onChange).toHaveBeenCalledWith('ezdrummer');
  });
});
