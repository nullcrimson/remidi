import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { gunzipSync, strFromU8 } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { WasmCallError } from '../src/core/errors';
import * as stub from './stubs/wasm';
import { MY_KIT, openSettings, pickEngines, startApp, store, storePresets, type StoredPreset } from './eventSteps';
import { recordDownloads } from './downloads';
import { fakeUmami } from './umami';

const downloads = recordDownloads();

const rackButton = () => screen.getByRole('button', { name: /^Download an Ableton rack for / });

const queryRackButton = () => screen.queryByRole('button', { name: /^Download an Ableton rack for / });

const rackCalls = () => vi.mocked(stub.remap_rack).mock.calls;

function storeSession(session: Record<string, unknown>): void {
  store('session', { version: 1, src: 'ggd_invasion', tgt: 'ezdrummer', edits: {}, srcEdits: {}, ...session });
}

async function gunzipped(blob: Blob): Promise<string> {
  return strFromU8(gunzipSync(new Uint8Array(await blob.arrayBuffer())));
}

describe('the summary row rack', () => {
  const umami = fakeUmami();

  it('the rack action shows once both engines are chosen, with no file', async () => {
    await startApp();
    expect(queryRackButton()).not.toBeInTheDocument();
    await pickEngines();
    expect(rackButton()).toHaveAccessibleName('Download an Ableton rack for GGD Invasion → EZdrummer (.adg)');
    expect(rackButton()).toHaveTextContent('↓Ableton rack');
  });

  it('it is gone while the plan fails', async () => {
    vi.mocked(stub.plan).mockImplementation(() => {
      throw new WasmCallError({ kind: 'internal', detail: 'boom' });
    });
    await startApp();
    await pickEngines();
    expect(queryRackButton()).not.toBeInTheDocument();
  });

  it('it saves "<FROM> to <TO>.adg" holding the gzipped rack', async () => {
    await startApp();
    await pickEngines();
    await userEvent.click(rackButton());
    expect(downloads().map((d) => d.name)).toEqual(['GGD Invasion to EZdrummer.adg']);
    expect(await gunzipped(downloads()[0].blob)).toBe(stub.RACK_XML);
  });

  it('it passes the note edits, Missing drums and Unrecognized settings', async () => {
    storeSession({ missing: 'drop', unrecognized: 'keep', edits: { 'kick.main': 40 } });
    await startApp();
    await userEvent.click(rackButton());
    expect(rackCalls()).toEqual([[
      'ggd_invasion',
      'ezdrummer',
      { tgt: [{ canon: 'kick.main', note: 40 }], src: [] },
      'drop',
      'keep',
      undefined,
    ]]);
  });

  it('it ignores the channel setting', async () => {
    storeSession({ channel: 'auto' });
    await startApp();
    await userEvent.click(rackButton());
    await openSettings();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Drum channel' }), '1');
    await userEvent.click(rackButton());
    expect(rackCalls()).toHaveLength(2);
    expect(rackCalls()[1]).toEqual(rackCalls()[0]);
  });

  it('with a preset loaded the file is named after the preset', async () => {
    storePresets(MY_KIT);
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    await userEvent.click(rackButton());
    expect(rackCalls()[0][5]).toBe('My kit');
    expect(downloads().map((d) => d.name)).toEqual(['My kit.adg']);
  });

  it('after a download the notice under the summary row gives the load step', async () => {
    await startApp();
    await pickEngines();
    await userEvent.click(rackButton());
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(
      'Rack saved: GGD Invasion to EZdrummer.adg. Drag it onto the MIDI track, in front of EZdrummer. In a clip, each row shows the drum and the note it now plays.',
    );
    expect(rackButton().closest('div')?.nextElementSibling).toBe(notice);
    expect(rackButton()).toHaveFocus();
  });

  it('it adds the silent-drums sentence when the rack drops drums', async () => {
    vi.mocked(stub.remap_rack).mockReturnValue({ fileName: 'GGD Invasion to EZdrummer.adg', xml: stub.RACK_XML, packing: 'gzip', dropped: 2 });
    await startApp();
    await pickEngines();
    await userEvent.click(rackButton());
    expect(screen.getByRole('status')).toHaveTextContent(
      '2 drums EZdrummer lacks have no row name in the clip, only a note like D1, and stay silent.',
    );
  });

  it('the rack notice goes when the pair changes', async () => {
    await startApp();
    await pickEngines();
    await userEvent.click(rackButton());
    expect(screen.getByRole('status')).toHaveTextContent(/Rack saved/);
    await userEvent.click(screen.getByRole('button', { name: 'Swap FROM and TO' }));
    expect(screen.queryByText(/Rack saved/)).not.toBeInTheDocument();
  });

  it('a failed rack says why and sends no event', async () => {
    vi.mocked(stub.remap_rack).mockImplementation(() => {
      throw { kind: 'internal', detail: 'boom' };
    });
    await startApp();
    await pickEngines();
    await userEvent.click(rackButton());
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't make the rack: Something went wrong");
    expect(downloads()).toEqual([]);
    expect(umami).not.toHaveBeenCalledWith('rack-downloaded', expect.anything());
  });

  it('the rack tooltip opens on focus', async () => {
    await startApp();
    await pickEngines();
    act(() => rackButton().focus());
    const tip = await screen.findByRole('tooltip');
    expect(within(tip).getByText('Play it live in Ableton')).toBeInTheDocument();
    expect(tip).toHaveTextContent('Put it in front of EZdrummer and GGD Invasion MIDI plays right');
  });
});

const KIT_A: StoredPreset = { ...MY_KIT, id: 'a', name: 'Kit A', edits: { 'kick.main': 40 } };

const KIT_B: StoredPreset = { ...MY_KIT, id: 'b', name: 'Kit B', src: 'ezdrummer', tgt: 'ggd_invasion', edits: { 'snare1.hit': 27 } };

const KIT_A_CALL = ['ggd_invasion', 'ezdrummer', { tgt: [{ canon: 'kick.main', note: 40 }], src: [] }, 'nearest', 'remove', 'Kit A'];

async function chooseRack(preset: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: `More actions for ${preset}` }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Ableton rack' }));
}

const summaryText = () => screen.getByText(/drums? remapped/).closest('div')?.parentElement?.textContent;

describe('a saved preset rack', () => {
  const umami = fakeUmami();

  it('a preset\'s rack uses that preset\'s engines and edits while another preset is loaded', async () => {
    storePresets(KIT_A, KIT_B);
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: /^Kit B/ }));
    const before = summaryText();
    await chooseRack('Kit A');
    expect(rackCalls()).toEqual([KIT_A_CALL]);
    expect(downloads().map((d) => d.name)).toEqual(['Kit A.adg']);
    expect(rackButton()).toHaveAccessibleName('Download an Ableton rack for EZdrummer → GGD Invasion (.adg)');
    expect(summaryText()).toBe(before);
  });

  it('… while no preset is loaded', async () => {
    storePresets(KIT_A);
    await startApp();
    await pickEngines();
    await userEvent.click(screen.getByRole('button', { name: 'Swap FROM and TO' }));
    await chooseRack('Kit A');
    expect(rackCalls()).toEqual([KIT_A_CALL]);
    expect(downloads().map((d) => d.name)).toEqual(['Kit A.adg']);
  });

  it('a preset whose engine is unknown cannot make a rack', async () => {
    storePresets({ ...KIT_A, tgt: 'gone' });
    await startApp();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for Kit A' }));
    expect(screen.getByRole('menuitem', { name: 'Ableton rack' })).toBeDisabled();
  });

  it('a failed preset rack from another pair says why', async () => {
    vi.mocked(stub.remap_rack).mockImplementation(() => {
      throw { kind: 'internal', detail: 'boom' };
    });
    storePresets(KIT_A);
    await startApp();
    await pickEngines();
    await userEvent.click(screen.getByRole('button', { name: 'Swap FROM and TO' }));
    await chooseRack('Kit A');
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't make the rack: Something went wrong");
    expect(umami).not.toHaveBeenCalledWith('rack-downloaded', expect.anything());
  });

  it('a preset rack\'s notice shows while another pair is open', async () => {
    storePresets(KIT_A);
    await startApp();
    await pickEngines();
    await userEvent.click(screen.getByRole('button', { name: 'Swap FROM and TO' }));
    await chooseRack('Kit A');
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Rack saved: Kit A.adg. Drag it onto the MIDI track, in front of EZdrummer.');
    expect(screen.getByRole('group', { name: 'Saved mappings' }).compareDocumentPosition(notice)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });

  it('a preset rack names the edits this version does not know', async () => {
    storePresets({ ...KIT_A, edits: { 'kick.main': 40, 'gone.drum': 41 } });
    await startApp();
    await chooseRack('Kit A');
    expect(rackCalls()).toEqual([KIT_A_CALL]);
    expect(screen.getByRole('status')).toHaveTextContent("1 edit in 'Kit A' uses a drum this version doesn't know; skipped.");
  });
});
