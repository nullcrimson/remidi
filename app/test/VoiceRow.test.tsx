import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceRow } from '../src/components/VoiceRow';

const base = {
  base: 'c1' as const,
  srcChanged: false,
  tgtChanged: false,
  srcExpanded: false,
  tgtExpanded: false,
  onSrcToggle: () => {},
  onToggle: () => {},
  onDismiss: () => {},
};

const kick = { canon: 'KickMain', label: 'Kick', srcNotes: [24], tgtNote: 36, defaultTgtNote: 36, status: 'direct' as const };

describe('VoiceRow', () => {
  it('shows the drum label plus source and target note buttons', () => {
    render(<VoiceRow row={kick} effectiveTgt={36} {...base} />);
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C2' })).toBeInTheDocument();
  });

  it('toggles the target picker on the target chip', async () => {
    const onToggle = vi.fn();
    render(<VoiceRow row={kick} effectiveTgt={36} {...base} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'C2' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('toggles the source picker on the source chip', async () => {
    const onSrcToggle = vi.fn();
    render(<VoiceRow row={kick} effectiveTgt={36} {...base} onSrcToggle={onSrcToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'C1' }));
    expect(onSrcToggle).toHaveBeenCalledOnce();
  });

  it('shows a dash for a dropped target but keeps the source chip', () => {
    render(
      <VoiceRow
        row={{ canon: 'China', label: 'China', srcNotes: [59], tgtNote: null, defaultTgtNote: null, status: 'dropped' }}
        effectiveTgt={null}
        {...base}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B3' })).toBeInTheDocument();
  });

  it('dismisses on an outside click only while a picker is expanded', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <VoiceRow row={kick} effectiveTgt={36} {...base} onDismiss={onDismiss} />,
    );
    fireEvent.mouseDown(document.body);
    expect(onDismiss).not.toHaveBeenCalled();

    rerender(<VoiceRow row={kick} effectiveTgt={36} {...base} tgtExpanded onDismiss={onDismiss} />);
    fireEvent.mouseDown(document.body);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('renders the picker slot only when a side is expanded', () => {
    const { rerender } = render(
      <VoiceRow row={kick} effectiveTgt={36} {...base}>
        <div data-testid="picker-slot" />
      </VoiceRow>,
    );
    expect(screen.queryByTestId('picker-slot')).toBeNull();
    rerender(
      <VoiceRow row={kick} effectiveTgt={36} {...base} tgtExpanded>
        <div data-testid="picker-slot" />
      </VoiceRow>,
    );
    expect(screen.getByTestId('picker-slot')).toBeInTheDocument();
  });

  it('marks extra source notes with a count', () => {
    render(<VoiceRow row={{ ...kick, srcNotes: [24, 23, 22] }} effectiveTgt={36} {...base} />);
    expect(screen.getByRole('button', { name: 'C1' })).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByLabelText('Also plays B0, A#0')).toBeInTheDocument();
  });

  it('lists the extra source notes in the marker tooltip', async () => {
    render(<VoiceRow row={{ ...kick, srcNotes: [24, 23, 22] }} effectiveTgt={36} {...base} />);
    await userEvent.hover(screen.getByText('+2'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Also B0, A#0');
  });

  it('shows no marker for a single source note', () => {
    render(<VoiceRow row={kick} effectiveTgt={36} {...base} />);
    expect(screen.queryByText(/^\+\d/)).toBeNull();
  });

  it('shows a dash on the source chip of a silent row and dims it', async () => {
    const onSrcToggle = vi.fn();
    const { container } = render(
      <VoiceRow row={{ ...kick, srcNotes: [] }} effectiveTgt={36} {...base} onSrcToggle={onSrcToggle} />,
    );
    const chip = screen.getByRole('button', { name: '—' });
    await userEvent.click(chip);
    expect(onSrcToggle).toHaveBeenCalledOnce();
    expect(container.firstElementChild).toHaveClass('opacity-60');
  });
});
