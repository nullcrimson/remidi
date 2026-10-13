import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFileIntake } from '../../src/convert/useFileIntake';
import { moduleLoader, type LoadMidiremap, type Midiremap } from '../../src/core/midiremap';
import type { NoticeLine } from '../../src/core/notice';

const PRESET = {
  name: 'kit.drumverter.json',
  text: JSON.stringify({ name: 'My kit', src: 'ggd_invasion', tgt: 'ezdrummer' }),
};

function intake(load: LoadMidiremap) {
  const save = vi.fn(() => 'new-id');
  const notify = vi.fn<(lines: NoticeLine[]) => void>();
  const { result } = renderHook(() =>
    useFileIntake({
      load,
      storeFiles: vi.fn(),
      src: null,
      tgt: null,
      saved: { mappings: [], save },
      notify,
      focus: vi.fn(),
      via: 'picker',
    }),
  );
  return { onFiles: result.current, save, notify };
}

describe('useFileIntake', () => {
  it('imports a preset dropped while the module loads, once it has loaded', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { onFiles, save, notify } = intake(() => gate.then(moduleLoader()));
    onFiles([], [], [PRESET]);
    expect(notify).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(notify).toHaveBeenCalledWith([{ message: { id: 'import-done', args: { name: 'My kit' } } }]));
    expect(save).toHaveBeenCalledWith({ name: 'My kit', src: 'ggd_invasion', tgt: 'ezdrummer', edits: {}, srcEdits: {} });
  });

  it('says the converter failed to load when a preset is dropped and the module cannot load', async () => {
    const { onFiles, save, notify } = intake(() => Promise.reject<Midiremap>(new Error('wasm boom')));
    onFiles([], [], [PRESET]);
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith([
        { failed: 'kit.drumverter.json', error: { kind: 'wasmUnavailable', detail: 'wasm boom' } },
      ]),
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('reports unreadable files in the same notice as the imported presets', async () => {
    const { onFiles, notify } = intake(moduleLoader());
    onFiles([], [], [PRESET], { mid: ['broken.mid'], presets: [] });
    await waitFor(() => expect(notify).toHaveBeenCalledOnce());
    expect(notify.mock.calls[0][0]).toHaveLength(2);
  });
});
