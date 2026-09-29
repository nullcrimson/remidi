import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SummaryRow } from '../src/components/SummaryRow';
import type { EditedState } from '../src/components/EditedChip';
import type { Message } from '../src/generated/i18n';

const LINES: Message[] = [
  { id: 'edit-line', args: { drum: 'Kick', now: 'C1 → B1', byDefault: 'C1 → C2' } },
  { id: 'edit-line', args: { drum: 'Snare', now: 'D1 → E2', byDefault: 'D1 → D2' } },
];

function renderRow(edited?: Partial<EditedState>) {
  const onReview = vi.fn();
  render(
    <SummaryRow
      remapped={45}
      total={47}
      onEdit={() => {}}
      edited={edited && { count: 2, lines: LINES, preset: { kind: 'none' }, onReview, ...edited }}
    />,
  );
  return onReview;
}

describe('SummaryRow edited chip', () => {
  it('is absent without edits', () => {
    renderRow();
    expect(screen.queryByRole('button', { name: /edited/ })).not.toBeInTheDocument();
  });

  it('counts the edited drums and opens the review', async () => {
    const onReview = renderRow({});
    const chip = screen.getByRole('button', { name: '2 drums edited — review changes' });
    expect(chip).toHaveTextContent('2 edited');
    await userEvent.click(chip);
    expect(onReview).toHaveBeenCalledOnce();
  });

  it('names the open preset when the edits are its own', () => {
    renderRow({ count: 1, preset: { kind: 'saved', name: 'My kit' } });
    const chip = screen.getByRole('button', { name: '1 drum edited — review changes, from preset My kit' });
    expect(chip).toHaveTextContent('My kit · 1 edited');
  });

  it('says unsaved when the edits differ from the open preset', () => {
    renderRow({ preset: { kind: 'unsaved', name: 'My kit' } });
    const chip = screen.getByRole('button', { name: '2 drums edited — review changes, not saved to My kit' });
    expect(chip).toHaveTextContent('2 edited · unsaved');
  });

  it('previews the changes on hover', async () => {
    renderRow({});
    await userEvent.hover(screen.getByRole('button', { name: /drums edited/ }));
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('2 drums differ from the default mapping');
    expect(tip).toHaveTextContent('Kick: C1 → B1 (default C1 → C2)');
    expect(tip).toHaveTextContent('Snare: D1 → E2 (default D1 → D2)');
    expect(tip).toHaveTextContent('Click to review or reset.');
  });

  it('says one drum differs', async () => {
    renderRow({ count: 1, lines: [LINES[0]] });
    await userEvent.hover(screen.getByRole('button', { name: /drum edited/ }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('1 drum differs from the default mapping');
  });
});
