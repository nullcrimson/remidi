import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PickerShell } from '../src/components/PickerShell';
import { VoiceRow } from '../src/components/VoiceRow';

const base = {
  base: 'c1' as const,
  srcChanged: false,
  tgtChanged: false,
  srcExpanded: false,
  tgtExpanded: false,
  onSrcToggle: () => {},
  onToggle: () => {},
  result: { text: 'direct', tone: 'text-t5' },
};

const kick = { canon: 'KickMain', label: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct' as const, tgtNote: 36 } };

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
        row={{ canon: 'China', label: 'China', srcNotes: [59], defaultTgtNote: null, outcome: { status: 'dropped', otherDrum: false } }}
        {...base}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B3' })).toBeInTheDocument();
  });

  it('keeps its picker open on a press inside the row and closes it on one outside', () => {
    const onClose = vi.fn();
    render(
      <VoiceRow row={kick} {...base} tgtExpanded>
        <PickerShell label="Target note for Kick" onClose={onClose}>
          <p>keys</p>
        </PickerShell>
      </VoiceRow>,
    );
    fireEvent.mouseDown(screen.getByText('Kick'));
    expect(onClose).not.toHaveBeenCalled();
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
      <VoiceRow row={kick} {...base} tgtExpanded>
        <div data-testid="picker-slot" />
      </VoiceRow>,
    );
    expect(screen.getByTestId('picker-slot')).toBeInTheDocument();
  });

  it('marks extra source notes with a count', () => {
    render(<VoiceRow row={{ ...kick, srcNotes: [24, 23, 22] }} {...base} />);
    expect(screen.getByRole('button', { name: 'C1' })).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(
      screen.getByLabelText('2 more source notes play Kick: B0, A#0. All go to C2.'),
    ).toBeInTheDocument();
  });

  it('explains the marker in its tooltip', async () => {
    render(<VoiceRow row={{ ...kick, srcNotes: [24, 23, 22] }} {...base} />);
    await userEvent.hover(screen.getByText('+2'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '2 more source notes play Kick: B0, A#0. All go to C2.',
    );
  });

  it('explains a single extra note and a dropped row', () => {
    const { rerender } = render(
      <VoiceRow row={{ ...kick, srcNotes: [24, 23] }} {...base} />,
    );
    expect(
      screen.getByLabelText('1 more source note plays Kick: B0. Both go to C2.'),
    ).toBeInTheDocument();
    rerender(
      <VoiceRow
        row={{ ...kick, srcNotes: [24, 23], outcome: { status: 'dropped', otherDrum: false } }}
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

  it('shows a dash on the source chip of a silent row and dims it', async () => {
    const onSrcToggle = vi.fn();
    const { container } = render(
      <VoiceRow row={{ ...kick, srcNotes: [] }} {...base} onSrcToggle={onSrcToggle} />,
    );
    const chip = screen.getByRole('button', { name: '—' });
    await userEvent.click(chip);
    expect(onSrcToggle).toHaveBeenCalledOnce();
    expect(container.firstElementChild).toHaveClass('opacity-60');
  });
});
