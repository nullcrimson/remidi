import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SourceEditor } from '../src/components/SourceEditor';
import { family_order } from './stubs/wasm';

const notes = [{ note: 24, canon: 'kick.main', label: 'Kick', family: 'Kick' as const }];

const options = [
  { canon: 'kick.main', label: 'Kick', family: 'Kick' as const },
  { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' as const },
];

function setup(srcEdits: Record<number, string | null> = {}) {
  const onSet = vi.fn();
  const onClear = vi.fn();
  render(
    <SourceEditor
      notes={notes}
      srcEdits={srcEdits}
      options={options}
      families={family_order()}
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

  it('shows an unassigned default note as unassigned, with a way back', async () => {
    const { onClear } = setup({ 24: null });
    const row = screen.getByRole('button', { name: /^C1/ });
    expect(row).toHaveTextContent('— unassigned');
    expect(row).not.toHaveTextContent('Kick');
    await userEvent.click(screen.getByRole('button', { name: /Clear source note/i }));
    expect(onClear).toHaveBeenCalledWith(24);
  });

  it('adds an arbitrary note and opens its picker', async () => {
    setup();
    await userEvent.type(screen.getByLabelText('Add source note'), '96{Enter}');
    expect(screen.getByRole('dialog', { name: /Canon for/i })).toBeInTheDocument();
  });

  it('rejects a note outside 0–127 visibly', async () => {
    setup();
    const input = screen.getByRole('textbox', { name: 'Add source note' });
    await userEvent.type(input, '200{Enter}');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a note number from 0 to 127');
    expect(screen.queryByRole('dialog', { name: /Canon for/i })).not.toBeInTheDocument();
    await userEvent.clear(input);
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText('Enter a note number from 0 to 127')).not.toBeInTheDocument();
    await userEvent.type(input, '60{Enter}');
    expect(screen.getByRole('dialog', { name: /Canon for/i })).toBeInTheDocument();
  });

  it('rejects text that is not a whole number', async () => {
    setup();
    const input = screen.getByRole('textbox', { name: 'Add source note' });
    await userEvent.type(input, '4.5');
    await userEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
