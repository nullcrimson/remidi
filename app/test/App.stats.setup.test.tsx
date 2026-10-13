import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { addMidi, pickEngines, startApp } from './eventSteps';
import { fakeUmami } from './umami';

describe('the events of setting up a conversion', () => {
  const umami = fakeUmami();

  it('sends engine-picked from the FROM list', async () => {
    await startApp();
    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    expect(umami).toHaveBeenCalledWith('engine-picked', { side: 'from', id: 'ggd_invasion', via: 'list' });
  });

  it('sends engine-picked from the TO list', async () => {
    await startApp();
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    expect(umami).toHaveBeenCalledWith('engine-picked', { side: 'to', id: 'ezdrummer', via: 'list' });
  });

  it('sends engine-picked with via filter for an engine picked after typing in the filter', async () => {
    await startApp();
    await userEvent.type(screen.getByRole('combobox', { name: 'Filter TO engines' }), 'ez{Enter}');
    expect(umami).toHaveBeenCalledWith('engine-picked', { side: 'to', id: 'ezdrummer', via: 'filter' });
  });

  it('sends engine-picked with via favorite for a starred engine', async () => {
    await startApp();
    await userEvent.click(screen.getAllByTestId('star-ezdrummer')[1]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);
    expect(umami).toHaveBeenCalledWith('engine-picked', { side: 'to', id: 'ezdrummer', via: 'favorite' });
  });

  it('sends engines-swapped when swap is pressed', async () => {
    await startApp();
    await pickEngines();
    await userEvent.click(screen.getByRole('button', { name: 'Swap FROM and TO' }));
    expect(umami).toHaveBeenCalledWith('engines-swapped');
  });

  it('sends engine-starred with on true when a star is set', async () => {
    await startApp();
    await userEvent.click(screen.getAllByTestId('star-ezdrummer')[0]);
    expect(umami).toHaveBeenCalledWith('engine-starred', { id: 'ezdrummer', on: true });
  });

  it('sends engine-starred with on false when a star is cleared', async () => {
    await startApp();
    await userEvent.click(screen.getAllByTestId('star-ezdrummer')[0]);
    await userEvent.click(screen.getAllByTestId('star-ezdrummer')[0]);
    expect(umami).toHaveBeenLastCalledWith('engine-starred', { id: 'ezdrummer', on: false });
  });

  it('sends file-removed with all false for one file', async () => {
    await startApp();
    await addMidi('a.mid', 'b.mid');
    await userEvent.click(screen.getByRole('button', { name: 'Remove a.mid' }));
    expect(umami).toHaveBeenCalledWith('file-removed', { all: false });
  });

  it('sends file-removed with all true when the list is cleared', async () => {
    await startApp();
    await addMidi('a.mid', 'b.mid');
    await userEvent.click(screen.getByRole('button', { name: 'clear all' }));
    expect(umami).toHaveBeenCalledWith('file-removed', { all: true });
  });

  it('sends setting-changed for the octave convention', async () => {
    await startApp();
    await userEvent.click(screen.getByRole('radio', { name: 'C-2' }));
    expect(umami).toHaveBeenCalledWith('setting-changed', { setting: 'octave', value: 'c2' });
  });

  it('sends setting-changed with value one for a single drum channel', async () => {
    await startApp();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Drum channel' }), '10');
    expect(umami).toHaveBeenCalledWith('setting-changed', { setting: 'channel', value: 'one' });
  });

  it('sends setting-changed with value all for every channel', async () => {
    await startApp();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Drum channel' }), 'all');
    expect(umami).toHaveBeenCalledWith('setting-changed', { setting: 'channel', value: 'all' });
  });

  it('sends setting-changed for the missing-drums setting', async () => {
    await startApp();
    await userEvent.click(screen.getByText('Drop'));
    expect(umami).toHaveBeenCalledWith('setting-changed', { setting: 'missing', value: 'drop' });
  });

  it('sends midi-added with via picker for files chosen in the file dialog', async () => {
    await startApp();
    await addMidi('groove.mid');
    expect(umami).toHaveBeenCalledWith('midi-added', { files: 1, via: 'picker', unreadable: 0 });
  });

  it('sends midi-added with via drop for files dropped on the page', async () => {
    await startApp();
    fireEvent.drop(window, { dataTransfer: { files: [new File([new Uint8Array([1])], 'groove.mid')] } });
    await waitFor(() => expect(umami).toHaveBeenCalledWith('midi-added', { files: 1, via: 'drop', unreadable: 0 }));
  });

  it('sends midi-added with no unreadable file for a preset file the browser could not read', async () => {
    await startApp();
    const lost = new File(['{}'], 'lost.json');
    Object.defineProperty(lost, 'text', { value: () => Promise.reject(new DOMException('gone', 'NotReadableError')) });
    await userEvent.upload(screen.getAllByTestId('file-input')[0], [new File([new Uint8Array([1])], 'groove.mid'), lost]);
    expect(umami).toHaveBeenCalledWith('midi-added', { files: 1, via: 'picker', unreadable: 0 });
  });

  it('sends midi-added with the number of MIDI files the browser could not read', async () => {
    await startApp();
    const unreadable = new File([new Uint8Array([1])], 'gone.mid');
    Object.defineProperty(unreadable, 'arrayBuffer', { value: () => Promise.reject(new DOMException('gone', 'NotReadableError')) });
    await addMidi('groove.mid');
    umami.mockClear();
    await userEvent.upload(screen.getAllByTestId('file-input')[0], [unreadable, new File([new Uint8Array([1])], 'fill.mid')]);
    expect(umami).toHaveBeenCalledWith('midi-added', { files: 1, via: 'picker', unreadable: 1 });
  });
});
