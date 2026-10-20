import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RemapOutput, VoiceRow } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { addMidi, convert, pickEngines, startApp } from './eventSteps';
import { typed, type Loose } from './typed';
import { fakeUmami } from './umami';

const reportOf = (report: Partial<Loose<RemapOutput['report']>>) => typed<RemapOutput>({
  bytes: new Uint8Array([1]),
  report: { unmappedSource: {}, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 10, ...report },
});

const swappedChina = () => {
  vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
    { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals', srcNotes: [60], defaultTgtNote: 49, outcome: { status: 'fallback', standIn: 'crash.1.hit', tgtNote: 49, otherDrum: true } },
  ]));
  vi.mocked(stub.remap).mockReturnValue(reportOf({ fallbackUsed: { 'china.1.hit': { standIn: 'crash.1.hit', note: 49, count: 3 } } }));
};

async function convertThenOpenReport() {
  await startApp();
  await pickEngines();
  await addMidi('groove.mid');
  await convert();
  await userEvent.click(screen.getByRole('button', { name: /View report/ }));
}

describe('the events of the report', () => {
  const umami = fakeUmami();

  it('sends report-opened when View report is pressed', async () => {
    await convertThenOpenReport();
    expect(umami).toHaveBeenCalledWith('report-opened');
  });

  it('sends report-fix-used for picking a target for a dropped drum', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportOf({ dropped: { 'china.1.hit': 2 } }));
    await convertThenOpenReport();
    await userEvent.click(screen.getByRole('button', { name: 'Pick a target →' }));
    expect(umami).toHaveBeenCalledWith('report-fix-used', { fix: 'pick-target' });
  });

  it('sends report-fix-used for assigning an unrecognized note', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportOf({ unmappedSource: { 51: 2 } }));
    await convertThenOpenReport();
    await userEvent.click(screen.getByRole('button', { name: 'Assign →' }));
    expect(umami).toHaveBeenCalledWith('report-fix-used', { fix: 'assign' });
  });

  it('sends report-fix-used for the drum channel hint', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportOf({ untouched: 4 }));
    await convertThenOpenReport();
    await userEvent.click(screen.getByRole('button', { name: 'Drum channel →' }));
    expect(umami).toHaveBeenCalledWith('report-fix-used', { fix: 'channel-hint' });
  });

  it('sends missing-dropped with where report as the one event for dropping missing drums from the report', async () => {
    swappedChina();
    await convertThenOpenReport();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Drop missing drums & convert again' }));
    const ofTheButton = umami.mock.calls.filter(([name]) => name === 'missing-dropped' || name === 'report-fix-used');
    expect(ofTheButton).toEqual([['missing-dropped', { where: 'report' }]]);
  });

  it('sends missing-dropped with where done for dropping missing drums from the done panel', async () => {
    swappedChina();
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await convert();
    await userEvent.click(screen.getByRole('button', { name: 'Drop missing drums & convert again' }));
    expect(umami).toHaveBeenCalledWith('missing-dropped', { where: 'done' });
  });

  it('sends done-wrong-source when Pick another source is pressed on the done panel', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportOf({ unmappedSource: { 51: 2 } }));
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await convert();
    await userEvent.click(screen.getByRole('button', { name: 'Pick another source' }));
    expect(umami).toHaveBeenCalledWith('done-wrong-source');
  });

  it('sends done-assign-unrecognized when Assign the notes is pressed on the done panel', async () => {
    vi.mocked(stub.remap).mockReturnValue(reportOf({ unmappedSource: { 51: 2 } }));
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await convert();
    await userEvent.click(screen.getByRole('button', { name: 'Assign the notes' }));
    expect(umami).toHaveBeenCalledWith('done-assign-unrecognized');
  });

  it('sends mapping-reported when the wrong-mapping link is followed', async () => {
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await convert();
    await userEvent.click(screen.getByRole('link', { name: 'Wrong mapping? Report it' }));
    expect(umami).toHaveBeenCalledWith('mapping-reported');
  });

  it('sends contact-used with link issues for the GitHub issue link in the report', async () => {
    await convertThenOpenReport();
    await userEvent.click(screen.getByRole('link', { name: 'GitHub issue' }));
    expect(umami).toHaveBeenCalledWith('contact-used', { link: 'issues' });
  });

  it('sends contact-used with link email for the address in the report', async () => {
    await convertThenOpenReport();
    await userEvent.click(screen.getByRole('link', { name: 'null.crimson.dev@gmail.com' }));
    expect(umami).toHaveBeenCalledWith('contact-used', { link: 'email' });
  });
});
