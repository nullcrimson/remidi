import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WasmCallError } from '../src/core/errors';
import * as stub from './stubs/wasm';
import type { Converted } from '../src/core/midiremap';
import { addMidi, convert, MY_KIT, pickEngines, startApp, store, storePresets } from './eventSteps';
import { recordDownloads } from './downloads';
import { typed } from './typed';
import { fakeUmami } from './umami';

const downloads = recordDownloads();

const remapWithNotes = () => typed<Converted>({
  bytes: new Uint8Array([1]),
  report: {
    unmappedSource: { 51: 1, 52: 1 },
    fallbackUsed: { 'hat.open3': { standIn: 'hat.open1', note: 46, count: 2 } },
    dropped: { 'china.1.hit': 1, 'hat.cc': 1, 'crash.1.hit': 1 },
    untouched: 0,
    converted: 4,
  },
});

describe('the events of converting', () => {
  const umami = fakeUmami();

  it('sends one file-failed with the number of files for failures of the same kind', async () => {
    vi.mocked(stub.remap).mockImplementation(() => {
      throw new WasmCallError({ kind: 'badMidi', detail: 'x' });
    });
    await startApp();
    await pickEngines();
    await addMidi('a.mid', 'b.mid');
    await userEvent.click(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }));
    await screen.findByRole('alert');
    expect(umami.mock.calls.filter(([name]) => name === 'file-failed')).toEqual([['file-failed', { kind: 'badMidi', files: 2 }]]);
  });

  it('sends a file-failed for each kind when the files fail differently', async () => {
    vi.mocked(stub.remap)
      .mockImplementationOnce(() => {
        throw new WasmCallError({ kind: 'badMidi', detail: 'x' });
      })
      .mockImplementationOnce(() => {
        throw new Error('boom');
      });
    await startApp();
    await pickEngines();
    await addMidi('a.mid', 'b.mid');
    await userEvent.click(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ }));
    await screen.findByRole('alert');
    expect(umami).toHaveBeenCalledWith('file-failed', { kind: 'badMidi', files: 1 });
    expect(umami).toHaveBeenCalledWith('file-failed', { kind: 'internal', files: 1 });
  });

  it('sends no file-failed when every file converted', async () => {
    await startApp();
    await pickEngines();
    await addMidi('a.mid');
    await convert();
    expect(umami).not.toHaveBeenCalledWith('file-failed', expect.anything());
  });

  it('sends convert-again when Convert more is pressed', async () => {
    await startApp();
    await pickEngines();
    await addMidi('a.mid');
    await convert();
    await userEvent.click(screen.getByRole('button', { name: 'Convert more' }));
    expect(umami).toHaveBeenCalledWith('convert-again');
  });

  it('sends converted with the pair, the preset flag and the size of each loss group', async () => {
    vi.mocked(stub.remap).mockReturnValue(remapWithNotes());
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await convert();
    expect(umami).toHaveBeenCalledWith('converted', {
      from: 'ggd_invasion',
      to: 'ezdrummer',
      pair: 'ggd_invasion>ezdrummer',
      files: 1,
      failed: 0,
      missing: 'nearest',
      edited: false,
      preset: false,
      dropped: 3,
      approximated: 1,
      unrecognized: 2,
    });
  });

  it('sends converted with preset true after a preset is loaded', async () => {
    storePresets(MY_KIT);
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    await addMidi('groove.mid');
    await convert();
    expect(umami).toHaveBeenCalledWith('converted', expect.objectContaining({ preset: true, edited: true }));
  });

  it('sends downloaded with how single for the one-file button', async () => {
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await convert();
    await userEvent.click(screen.getByRole('link', { name: /Download \.mid/ }));
    expect(umami).toHaveBeenCalledWith('downloaded', { files: 1, how: 'single' });
  });

  it('sends downloaded with how zip for the zip button', async () => {
    await startApp();
    await pickEngines();
    await addMidi('a.mid', 'b.mid');
    await convert();
    await userEvent.click(screen.getByRole('button', { name: /Download 2 files/ }));
    expect(downloads()).toHaveLength(1);
    expect(umami).toHaveBeenCalledWith('downloaded', { files: 2, how: 'zip' });
  });

  it('sends rack-downloaded from the summary row, not edited', async () => {
    await startApp();
    await pickEngines();
    await userEvent.click(screen.getByRole('button', { name: /^Download an Ableton rack for / }));
    expect(umami).toHaveBeenCalledWith('rack-downloaded', { where: 'summary', edited: false });
  });

  it('sends rack-downloaded from the summary row as edited after an edit', async () => {
    store('session', { version: 1, src: 'ggd_invasion', tgt: 'ezdrummer', edits: { 'kick.main': 40 }, srcEdits: {} });
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: /^Download an Ableton rack for / }));
    expect(umami).toHaveBeenCalledWith('rack-downloaded', { where: 'summary', edited: true });
  });

  it('sends downloaded with how file for a link beside one file of a batch', async () => {
    await startApp();
    await pickEngines();
    await addMidi('a.mid', 'b.mid');
    await convert();
    await userEvent.click(screen.getAllByRole('link', { name: '↓ .mid' })[0]);
    expect(umami).toHaveBeenCalledWith('downloaded', { files: 1, how: 'file' });
  });
});
