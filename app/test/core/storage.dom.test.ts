import { describe, expect, it, vi } from 'vitest';
import { onStoredChange, storedName } from '../../src/core/storage';

describe('onStoredChange', () => {
  const fire = (key: string | null) => window.dispatchEvent(new StorageEvent('storage', { key }));

  it('calls back when its own key changes', () => {
    const changed = vi.fn();
    const stop = onStoredChange('mappings', changed);
    fire(storedName('mappings'));
    stop();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('calls back when the storage is cleared', () => {
    const changed = vi.fn();
    const stop = onStoredChange('mappings', changed);
    fire(null);
    stop();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('ignores another key', () => {
    const changed = vi.fn();
    const stop = onStoredChange('mappings', changed);
    fire(storedName('tip'));
    stop();
    expect(changed).not.toHaveBeenCalled();
  });

  it('stops calling back once stopped', () => {
    const changed = vi.fn();
    onStoredChange('mappings', changed)();
    fire(storedName('mappings'));
    expect(changed).not.toHaveBeenCalled();
  });
});
