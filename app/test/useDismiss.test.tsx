import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDismiss } from '../src/hooks/useDismiss';

function Probe({ onDismiss, active }: { onDismiss: () => void; active?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, onDismiss, active);
  return (
    <div>
      <div ref={ref} data-testid="box">
        <button type="button" data-testid="inside">
          inside
        </button>
      </div>
      <button type="button" data-testid="outside">
        outside
      </button>
    </div>
  );
}

describe('useDismiss', () => {
  it('fires on mousedown outside the ref', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('ignores mousedown inside the ref', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByTestId('inside'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not listen when inactive', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} active={false} />);
    fireEvent.mouseDown(screen.getByTestId('outside'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('fires on Escape', () => {
    const onDismiss = vi.fn();
    render(<Probe onDismiss={onDismiss} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
