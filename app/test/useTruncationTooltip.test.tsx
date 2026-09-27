import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTruncationTooltip } from '../src/hooks/useTruncationTooltip';

function Fixture({ scrollWidth }: { scrollWidth: number }) {
  const { show, hide, tooltip } = useTruncationTooltip();
  return (
    <div data-testid="clipping-box" style={{ overflow: 'hidden' }}>
      <span
        ref={(el) => {
          if (!el) return;
          Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
          Object.defineProperty(el, 'clientWidth', { configurable: true, value: 50 });
        }}
        onMouseEnter={(e) => show(e.currentTarget, 'GGD One Kit Wonder: Modern Fusion')}
        onMouseLeave={hide}
      >
        GGD One Kit…
      </span>
      {tooltip}
    </div>
  );
}

describe('useTruncationTooltip', () => {
  it('shows the full name outside any clipping or masked container', () => {
    render(<Fixture scrollWidth={200} />);
    fireEvent.mouseEnter(screen.getByText('GGD One Kit…'));
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('GGD One Kit Wonder: Modern Fusion');
    expect(screen.getByTestId('clipping-box')).not.toContainElement(tip);
    expect(tip.parentElement).toBe(document.body);
  });

  it('stays hidden when the name fits', () => {
    render(<Fixture scrollWidth={40} />);
    fireEvent.mouseEnter(screen.getByText('GGD One Kit…'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
