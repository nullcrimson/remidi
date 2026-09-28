import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDropGuard } from '../src/hooks/useDropGuard';

function fire(type: string): boolean {
  const e = new Event(type, { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
}

describe('useDropGuard', () => {
  it('keeps the browser from opening a dropped file while mounted', () => {
    const { unmount } = renderHook(() => useDropGuard());
    expect(fire('dragover')).toBe(true);
    expect(fire('drop')).toBe(true);
    unmount();
    expect(fire('dragover')).toBe(false);
    expect(fire('drop')).toBe(false);
  });
});
