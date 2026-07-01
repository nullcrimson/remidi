import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoiceRow } from '../src/components/VoiceRow';

const base = {
  base: 'c1' as const,
  expanded: false,
  pickOctIndex: 3,
  onOpen: () => {},
  onSetOct: () => {},
  onPick: () => {},
  onClose: () => {},
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

  it('opens the target picker (source chip is not a button)', async () => {
    const onOpen = vi.fn();
    render(
      <VoiceRow
        row={{ canon: 'KickMain', label: 'Kick', srcNote: 24, tgtNote: 36, status: 'direct' }}
        effectiveTgt={36}
        {...base}
        onOpen={onOpen}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'C2' }));
    expect(onOpen).toHaveBeenCalledOnce();
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
});
