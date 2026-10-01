import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SummaryRow } from '../src/components/SummaryRow';
import type { EditedState } from '../src/components/EditedChip';
import type { Message } from '../src/generated/i18n';
import type { PlanBreakdown } from '../src/lib/planBreakdown';

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

describe('SummaryRow breakdown', () => {
  const BREAKDOWN: PlanBreakdown = {
    moved: 15,
    same: 2,
    variant: [{ drum: 'Kick (Alt)', now: 'Kick' }],
    swapped: [{ drum: 'China', now: 'Crash 1' }],
    dropped: ['Tom 4'],
    unplayed: 2,
  };

  function renderBreakdown(breakdown: PlanBreakdown) {
    const onEdit = vi.fn();
    render(
      <SummaryRow
        remapped={18}
        total={22}
        onEdit={onEdit}
        breakdown={breakdown}
        names={{ source: 'GetGood Drums', target: 'EZdrummer 3' }}
      />,
    );
    return onEdit;
  }

  async function open() {
    await userEvent.hover(screen.getByRole('button', { name: '18 of 22 drums remapped' }));
    return screen.findByRole('dialog');
  }

  it('shows what happens to every drum, naming the few that changed drum', async () => {
    renderBreakdown(BREAKDOWN);
    const panel = await open();
    expect(panel).toHaveTextContent('22 drums in this mapping');
    expect(within(panel).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '15on a new note',
      '2already on the right notesame note in both engines',
      '1played on a close variantno exact match in EZdrummer 3 — a variant of the same drum playsKick (Alt) → Kick',
      '1played on another drumnot in EZdrummer 3 — the closest drum plays insteadChina → Crash 1',
      '1left outnot in EZdrummer 3, so left outTom 4',
      '2not in the source engineno note in GetGood Drums',
    ]);
  });

  it('puts each changed drum on its own line', async () => {
    renderBreakdown({ ...BREAKDOWN, swapped: [{ drum: 'China', now: 'Crash 1' }, { drum: 'Bell', now: 'Ride Bell' }] });
    const panel = await open();
    expect(within(panel).getByText('China → Crash 1')).toHaveClass('block');
    expect(within(panel).getByText('Bell → Ride Bell')).toHaveClass('block');
  });

  it('leaves out empty groups', async () => {
    renderBreakdown({ ...BREAKDOWN, same: 0, unplayed: 0, dropped: [], variant: [] });
    const panel = await open();
    expect(panel).not.toHaveTextContent('already on the right note');
    expect(panel).not.toHaveTextContent('left out');
    expect(panel).not.toHaveTextContent('close variant');
    expect(panel).not.toHaveTextContent('not in the source engine');
  });

  it('opens the editor on the problem drums when there are any', async () => {
    const onEdit = renderBreakdown(BREAKDOWN);
    await userEvent.click(within(await open()).getByRole('button', { name: 'Change in note editor →' }));
    expect(onEdit).toHaveBeenCalledWith('issues');
  });

  it('opens the whole editor when nothing changed drum', async () => {
    const onEdit = renderBreakdown({ ...BREAKDOWN, variant: [], swapped: [], dropped: [] });
    await userEvent.click(within(await open()).getByRole('button', { name: 'Change in note editor →' }));
    expect(onEdit).toHaveBeenCalledWith('all');
  });
});
