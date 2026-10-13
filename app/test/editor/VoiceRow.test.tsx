import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PickerShell } from '../../src/editor/PickerShell';
import { VoiceRow } from '../../src/editor/VoiceRow';
import type { VoiceRow as VoiceRowData } from '../../src/core/midiremap';
import { typed, type Loose } from '../typed';

const base = {
  base: 'c1' as const,
  srcChanged: false,
  tgtChanged: false,
  expanded: null,
  onSrcToggle: () => {},
  onToggle: () => {},
  result: { text: 'direct', tone: 'faint' as const },
};

const kickFixture = { canon: 'KickMain', label: 'Kick', family: 'Kick' as const, srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct' as const, tgtNote: 36 } };
const rowOf = (extra: Partial<Loose<VoiceRowData>> = {}) => typed<VoiceRowData>({ ...kickFixture, ...extra });
const kick = rowOf();

describe('VoiceRow', () => {
  it('shows the drum label plus source and target note buttons', () => {
    render(<VoiceRow row={kick} {...base} />);
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C2' })).toBeInTheDocument();
  });

  it('toggles the target picker on the target chip', async () => {
    const onToggle = vi.fn();
    render(<VoiceRow row={kick} {...base} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'C2' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('toggles the source picker on the source chip', async () => {
    const onSrcToggle = vi.fn();
    render(<VoiceRow row={kick} {...base} onSrcToggle={onSrcToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'C1' }));
    expect(onSrcToggle).toHaveBeenCalledOnce();
  });

  it('shows a dash for a dropped target but keeps the source chip', () => {
    render(
      <VoiceRow
        row={typed<VoiceRowData>({ canon: 'China', label: 'China', family: 'Cymbals', srcNotes: [59], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } })}
        {...base}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B3' })).toBeInTheDocument();
  });

  it('keeps its picker open on a press inside the row', () => {
    const onClose = vi.fn();
    render(
      <VoiceRow row={kick} {...base} expanded="tgt">
        <PickerShell label="Target note for Kick" onClose={onClose}>
          <p>keys</p>
        </PickerShell>
      </VoiceRow>,
    );
    fireEvent.mouseDown(screen.getByText('Kick'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes its picker on a press outside the row', () => {
    const onClose = vi.fn();
    render(
      <VoiceRow row={kick} {...base} expanded="tgt">
        <PickerShell label="Target note for Kick" onClose={onClose}>
          <p>keys</p>
        </PickerShell>
      </VoiceRow>,
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders the picker slot only when a side is expanded', () => {
    const { rerender } = render(
      <VoiceRow row={kick} {...base}>
        <div data-testid="picker-slot" />
      </VoiceRow>,
    );
    expect(screen.queryByTestId('picker-slot')).toBeNull();
    rerender(
      <VoiceRow row={kick} {...base} expanded="tgt">
        <div data-testid="picker-slot" />
      </VoiceRow>,
    );
    expect(screen.getByTestId('picker-slot')).toBeInTheDocument();
  });

  it('marks extra source notes with a count', () => {
    render(<VoiceRow row={rowOf({ srcNotes: [24, 23, 22] })} {...base} />);
    expect(screen.getByRole('button', { name: 'C1' })).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(
      screen.getByLabelText('2 more source notes play Kick: B0, A#0. All go to C2.'),
    ).toBeInTheDocument();
  });

  it('explains the marker in its tooltip', async () => {
    render(<VoiceRow row={rowOf({ srcNotes: [24, 23, 22] })} {...base} />);
    await userEvent.hover(screen.getByText('+2'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '2 more source notes play Kick: B0, A#0. All go to C2.',
    );
  });

  it('explains a single extra note', () => {
    render(
      <VoiceRow row={rowOf({ srcNotes: [24, 23] })} {...base} />,
    );
    expect(
      screen.getByLabelText('1 more source note plays Kick: B0. Both go to C2.'),
    ).toBeInTheDocument();
  });

  it('explains a single extra note of a dropped row', () => {
    render(
      <VoiceRow
        row={rowOf({ srcNotes: [24, 23], outcome: { status: 'dropped', otherDrum: false } })}
        {...base}
      />,
    );
    expect(
      screen.getByLabelText('1 more source note plays Kick: B0. None has a target.'),
    ).toBeInTheDocument();
  });

  it('shows no marker for a single source note', () => {
    render(<VoiceRow row={kick} {...base} />);
    expect(screen.queryByText(/^\+\d/)).toBeNull();
  });

  it('shows a dash on the source chip of a silent row and toggles the source picker on it', async () => {
    const onSrcToggle = vi.fn();
    render(
      <VoiceRow row={rowOf({ srcNotes: [] })} {...base} onSrcToggle={onSrcToggle} />,
    );
    const chip = screen.getByRole('button', { name: '—' });
    await userEvent.click(chip);
    expect(onSrcToggle).toHaveBeenCalledOnce();
  });

  it('dims a silent row', () => {
    const { container } = render(
      <VoiceRow row={rowOf({ srcNotes: [] })} {...base} />,
    );
    expect(container.firstElementChild).toHaveClass('opacity-60');
  });

  const CHAIN = { text: '≈ Crash 2 → Ride', tone: 'gold' as const };

  function plays(scrollWidth: number): HTMLElement {
    render(<VoiceRow row={kick} {...base} result={CHAIN} />);
    const cell = screen.getByTestId('result');
    Object.defineProperty(cell, 'scrollWidth', { configurable: true, value: scrollWidth });
    Object.defineProperty(cell, 'clientWidth', { configurable: true, value: 100 });
    return cell;
  }

  it('shows the whole Plays text in a tooltip when the mouse is over text that is cut off', async () => {
    await userEvent.hover(plays(240));
    expect(screen.getByRole('tooltip')).toHaveTextContent('≈ Crash 2 → Ride');
  });

  it('shows no tooltip over Plays text that fits', async () => {
    await userEvent.hover(plays(80));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('takes the Plays tooltip away when the mouse leaves', async () => {
    const cell = plays(240);
    await userEvent.hover(cell);
    await userEvent.unhover(cell);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('leaves the Plays text without a second, native tooltip', () => {
    expect(plays(240)).not.toHaveAttribute('title');
  });

  const explained = (onGo = vi.fn()) => ({ ...CHAIN, why: { hint: 'EZdrummer has no China, so Crash 2 plays it.', onGo } });
  const EXPLAINED = explained();

  it('explains Plays text that has a hint when the mouse is over it', async () => {
    render(<VoiceRow row={kick} {...base} result={EXPLAINED} />);
    await userEvent.hover(screen.getByText('≈ Crash 2 → Ride'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('EZdrummer has no China, so Crash 2 plays it.');
  });

  it('explains Plays text that has a hint when it takes focus from the keyboard', async () => {
    render(<VoiceRow row={kick} {...base} result={EXPLAINED} />);
    screen.getByText('≈ Crash 2 → Ride').focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('EZdrummer has no China, so Crash 2 plays it.');
  });

  it('marks Plays text that has a hint as having more to show', () => {
    render(<VoiceRow row={kick} {...base} result={EXPLAINED} />);
    expect(screen.getByText('≈ Crash 2 → Ride')).toHaveClass('border-dotted');
  });

  it('runs the jump of explained Plays text when it is clicked', async () => {
    const onGo = vi.fn();
    render(<VoiceRow row={kick} {...base} result={explained(onGo)} />);
    await userEvent.click(screen.getByRole('button', { name: '≈ Crash 2 → Ride' }));
    expect(onGo).toHaveBeenCalledOnce();
  });

  it('leaves Plays text without a hint unmarked', () => {
    render(<VoiceRow row={kick} {...base} result={CHAIN} />);
    expect(screen.getByText('≈ Crash 2 → Ride')).not.toHaveClass('border-dotted');
  });
});
