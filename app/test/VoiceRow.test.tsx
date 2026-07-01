import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceRow } from '../src/components/VoiceRow';

const base = {
  base: 'c1' as const,
  expanded: false,
  onToggle: () => {},
};

describe('VoiceRow', () => {
  it('shows source (read-only) and target note names', () => {
    render(
      <VoiceRow
        row={{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }}
        effectiveTgt={36}
        {...base}
      />,
    );
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('C1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C2' })).toBeInTheDocument();
  });

  it('toggles the picker (source chip is not a button)', async () => {
    const onToggle = vi.fn();
    render(
      <VoiceRow
        row={{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }}
        effectiveTgt={36}
        {...base}
        onToggle={onToggle}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'C2' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'C1' })).toBeNull();
  });

  it('shows a dash for a dropped target', () => {
    render(
      <VoiceRow
        row={{ canon: 'China', label: 'China', srcNote: 59, tgtNote: null, status: 'dropped' }}
        effectiveTgt={null}
        {...base}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('tags the target button as a note-pick trigger', () => {
    render(
      <VoiceRow
        row={{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }}
        effectiveTgt={36}
        {...base}
      />,
    );
    expect(screen.getByRole('button', { name: 'C2' })).toHaveAttribute('data-notepick-trigger');
  });

  it('renders the picker slot only when expanded', () => {
    const { rerender } = render(
      <VoiceRow
        row={{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }}
        effectiveTgt={36}
        {...base}
      >
        <div data-testid="picker-slot" />
      </VoiceRow>,
    );
    expect(screen.queryByTestId('picker-slot')).toBeNull();
    rerender(
      <VoiceRow
        row={{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }}
        effectiveTgt={36}
        {...base}
        expanded
      >
        <div data-testid="picker-slot" />
      </VoiceRow>,
    );
    expect(screen.getByTestId('picker-slot')).toBeInTheDocument();
  });
});
