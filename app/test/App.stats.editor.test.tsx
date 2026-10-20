import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WasmCallError } from '../src/core/errors';
import * as stub from './stubs/wasm';
import { addMidi, convert, MY_KIT, openEditor, pickEngines, startApp, storePresets } from './eventSteps';
import { fakeUmami } from './umami';

const chips = () => screen.getAllByRole('button', { expanded: false, name: /^[A-G]/ });

async function openEditorOnKick() {
  await startApp();
  await pickEngines();
  await openEditor();
}

describe('the events of the note editor', () => {
  const umami = fakeUmami();

  it('sends editor-closed with how done and empty counts for a session with no edits', async () => {
    await openEditorOnKick();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(umami).toHaveBeenCalledWith('editor-closed', { how: 'done', targets: 0, sources: 0, keyboard: 0, list: 0, filtered: false, resets: 0 });
  });

  it('sends editor-closed with how back for the Back button', async () => {
    await openEditorOnKick();
    await userEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(umami).toHaveBeenCalledWith('editor-closed', expect.objectContaining({ how: 'back' }));
  });

  it('sends editor-closed with how history when the browser steps back', async () => {
    await openEditorOnKick();
    history.back();
    await waitFor(() => expect(umami).toHaveBeenCalledWith('editor-closed', expect.objectContaining({ how: 'history' })));
  });

  it('counts a pick of a source note as neither a keyboard nor a list pick', async () => {
    await openEditorOnKick();
    await userEvent.click(chips()[2]);
    await userEvent.click(screen.getByRole('button', { name: 'E1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(umami).toHaveBeenCalledWith('editor-closed', expect.objectContaining({ keyboard: 0, list: 0 }));
  });

  it('reports the counts of an editing session when it closes', async () => {
    await openEditorOnKick();
    await userEvent.click(chips()[1]);
    await userEvent.click(screen.getByRole('button', { name: /^Crash 1 ?C#3$/ }));
    await userEvent.click(chips()[2]);
    await userEvent.click(screen.getByRole('button', { name: 'E1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset Kick' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter drums' }), 'sna');
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(umami).toHaveBeenCalledWith('editor-closed', { how: 'done', targets: 0, sources: 2, keyboard: 0, list: 1, filtered: true, resets: 1 });
  });

  it('counts no target edit for a preset opened from its pencil and closed at once', async () => {
    storePresets(MY_KIT);
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: 'Edit notes for My kit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(umami).toHaveBeenCalledWith('editor-closed', expect.objectContaining({ targets: 0 }));
  });

  it('counts the show filter as a filter', async () => {
    await openEditorOnKick();
    await userEvent.click(screen.getByRole('radio', { name: /^Issues/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(umami).toHaveBeenCalledWith('editor-closed', expect.objectContaining({ filtered: true }));
  });

  it('starts the tally again when the editor opens again', async () => {
    await openEditorOnKick();
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter drums' }), 'sna');
    await userEvent.click(screen.getByRole('button', { name: '← Back' }));
    await openEditor();
    await userEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(umami).toHaveBeenLastCalledWith('editor-closed', expect.objectContaining({ filtered: false }));
  });

  it('sends editor-reset when Reset all is pressed', async () => {
    await openEditorOnKick();
    await userEvent.click(chips()[1]);
    await userEvent.click(screen.getByRole('button', { name: /^Crash 1 ?C#3$/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    expect(umami).toHaveBeenCalledWith('editor-reset');
  });

  it('sends plan-failed with the kind of error when the rows cannot load', async () => {
    vi.mocked(stub.plan).mockImplementation(() => {
      throw new WasmCallError({ kind: 'badOverrides', detail: 'x' });
    });
    await startApp();
    await pickEngines();
    expect(umami).toHaveBeenCalledWith('plan-failed', { kind: 'badOverrides' });
  });

  it('sends editor-opened from summary for the summary row', async () => {
    await startApp();
    await pickEngines();
    await openEditor();
    expect(umami).toHaveBeenCalledWith('editor-opened', { show: 'all', from: 'summary' });
  });

  it('sends editor-opened from missing for the missing-drums link', async () => {
    await startApp();
    await pickEngines();
    await userEvent.hover(screen.getByRole('button', { name: '1 drum played on another drum' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Change in note editor →' }));
    expect(umami).toHaveBeenCalledWith('editor-opened', { show: 'issues', from: 'missing' });
  });

  it('sends editor-opened from report for a fix in the report', async () => {
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await convert();
    await userEvent.click(screen.getByRole('button', { name: /View report/ }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Pick a target →' })[0]);
    expect(umami).toHaveBeenCalledWith('editor-opened', { show: 'all', from: 'report' });
  });

  it('sends editor-opened from history when the browser steps forward onto the editor', async () => {
    await startApp();
    await pickEngines();
    await openEditor();
    umami.mockClear();
    history.back();
    await waitFor(() => expect(screen.queryByText('Edit notes')).not.toBeInTheDocument());
    history.forward();
    await waitFor(() => expect(umami).toHaveBeenCalledWith('editor-opened', { show: 'all', from: 'history' }));
  });

  it('sends editor-opened when the editor opens from a preset pencil', async () => {
    storePresets(MY_KIT);
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: 'Edit notes for My kit' }));
    expect(umami).toHaveBeenCalledWith('editor-opened', { show: 'all', from: 'preset' });
  });
});
