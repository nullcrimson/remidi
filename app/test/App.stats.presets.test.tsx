import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as stub from './stubs/wasm';
import { presetName } from './typed';
import { WasmCallError } from '../src/core/errors';
import { failWrites, MY_KIT, openEditor, pickEngines, startApp, storePresets } from './eventSteps';
import { recordDownloads } from './downloads';
import { fakeUmami } from './umami';

recordDownloads();

const choose = async (item: string) => {
  await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
  await userEvent.click(screen.getByRole('menuitem', { name: item }));
};

describe('the events of presets', () => {
  const umami = fakeUmami();

  it('sends preset-managed for rename', async () => {
    storePresets(MY_KIT);
    await startApp();
    await choose('Rename');
    expect(umami).toHaveBeenCalledWith('preset-managed', { action: 'rename' });
  });

  it('sends preset-managed for duplicate', async () => {
    storePresets(MY_KIT);
    await startApp();
    await choose('Duplicate');
    expect(umami).toHaveBeenCalledWith('preset-managed', { action: 'duplicate' });
  });

  it('sends preset-managed for export', async () => {
    storePresets(MY_KIT);
    await startApp();
    await choose('Export');
    expect(umami).toHaveBeenCalledWith('preset-managed', { action: 'export' });
  });

  it('sends preset-managed for delete', async () => {
    storePresets(MY_KIT);
    await startApp();
    await choose('Delete');
    expect(umami).toHaveBeenCalledWith('preset-managed', { action: 'delete' });
  });

  it('sends rack-downloaded from a preset as edited, and no preset-managed', async () => {
    storePresets(MY_KIT);
    await startApp();
    await choose('Ableton rack');
    expect(umami).toHaveBeenCalledWith('rack-downloaded', { where: 'preset', edited: true });
    expect(umami).not.toHaveBeenCalledWith('preset-managed', expect.anything());
  });

  it('sends presets-unsaved when the browser cannot store a change', async () => {
    storePresets(MY_KIT);
    await startApp();
    const set = failWrites();
    try {
      await choose('Duplicate');
      expect(umami).toHaveBeenCalledWith('presets-unsaved');
    } finally {
      set.mockRestore();
    }
  });

  it('sends presets-unsaved once however many changes fail to store', async () => {
    storePresets(MY_KIT);
    await startApp();
    const set = failWrites();
    try {
      await choose('Duplicate');
      await choose('Duplicate');
      expect(umami.mock.calls.filter(([name]) => name === 'presets-unsaved')).toHaveLength(1);
    } finally {
      set.mockRestore();
    }
  });

  it('sends preset-imported with the edits skipped and the files refused', async () => {
    await startApp();
    vi.mocked(stub.parse_preset_file).mockImplementation((json) => {
      if (json === 'bad') throw new WasmCallError({ kind: 'badPreset', detail: 'no' });
      return { name: presetName('Kit'), src: 'ggd_invasion', tgt: 'ezdrummer', edits: {}, srcEdits: {}, skipped: ['a', 'b'] };
    });
    await userEvent.upload(
      screen.getAllByTestId('file-input')[0],
      [new File(['{}'], 'one.json'), new File(['bad'], 'two.json')],
      { applyAccept: false },
    );
    await waitFor(() => expect(umami).toHaveBeenCalledWith('preset-imported', { files: 2, skipped: 2, failed: 1 }));
  });

  it('sends preset-saved with how new and the number of edits', async () => {
    await startApp();
    await pickEngines();
    await openEditor();
    await userEvent.click(screen.getByRole('button', { name: 'Save as preset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(umami).toHaveBeenCalledWith('preset-saved', { how: 'new', stored: true, edits: 0 }));
  });

  it('sends preset-saved with how update for a preset opened from its chip', async () => {
    storePresets(MY_KIT);
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: 'Edit notes for My kit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Update preset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(umami).toHaveBeenCalledWith('preset-saved', { how: 'update', stored: true, edits: 1 }));
  });

  it('sends preset-loaded for a chip press', async () => {
    storePresets(MY_KIT);
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    expect(umami).toHaveBeenCalledWith('preset-loaded');
  });

  it('sends preset-saved with stored false when the browser cannot store the preset', async () => {
    await startApp();
    await pickEngines();
    await openEditor();
    const set = failWrites();
    try {
      await userEvent.click(screen.getByRole('button', { name: 'Save as preset' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(umami).toHaveBeenCalledWith('preset-saved', { how: 'new', stored: false, edits: 0 });
    } finally {
      set.mockRestore();
    }
  });

  it('does not send preset-loaded for the pencil of a chip', async () => {
    storePresets(MY_KIT);
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: 'Edit notes for My kit' }));
    expect(umami).not.toHaveBeenCalledWith('preset-loaded');
  });
});
