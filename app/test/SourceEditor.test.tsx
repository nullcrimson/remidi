import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SourceEditor } from '../src/components/SourceEditor';

const notes = [{ note: 24, canon: 'kick.main', label: 'Kick', family: 'Kick' }];

const options = [
  { canon: 'kick.main', label: 'Kick', family: 'Kick' },
  { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
];

function setup(srcEdits: Record<number, string> = {}) {
  const onSet = vi.fn();
  const onClear = vi.fn();
  render(
    <SourceEditor
      notes={notes}
      srcEdits={srcEdits}
      options={options}
      base="c1"
      onSet={onSet}
      onClear={onClear}
    />,
  );
  return { onSet, onClear };
}

describe('SourceEditor', () => {
  it('assigns a canon to a source note via the picker', async () => {
    const { onSet } = setup();
    await userEvent.click(screen.getByRole('button', { name: /C1/ }));
    const dialog = screen.getByRole('dialog', { name: /Canon for/i });
    await userEvent.click(within(dialog).getByText('China 1'));
    expect(onSet).toHaveBeenCalledWith(24, 'china.1.hit');
  });

  it('clears an existing source override', async () => {
    const { onClear } = setup({ 24: 'china.1.hit' });
    await userEvent.click(screen.getByRole('button', { name: /Clear source note/i }));
    expect(onClear).toHaveBeenCalledWith(24);
  });

  it('adds an arbitrary note and opens its picker', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('Add source note'), '96{Enter}');
    expect(screen.getByRole('dialog', { name: /Canon for/i })).toBeInTheDocument();
  });
});
