import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine, SourceFits } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { addMidi, pickEngines, startApp } from './eventSteps';
import { typed } from './typed';

const ENGINES = typed<Engine[]>([
  { id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GetGood Drums Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer', fullName: 'Toontrack EZdrummer 3' },
  { id: 'ggd_mm', name: 'GGD Modern & Massive', fullName: 'GetGood Drums Modern & Massive' },
  { id: 'ggd_rock', name: 'GGD Rock Fundamentals', fullName: 'GetGood Drums Rock Fundamentals' },
  { id: 'ggd_one', name: 'GGD One Kit Wonder', fullName: 'GetGood Drums One Kit Wonder' },
  { id: 'sd3', name: 'Superior Drummer 3', fullName: 'Toontrack Superior Drummer 3' },
]);

const fit = (engine: string, recognized: number) => ({ engine, recognized });

function fitsWithInvasionAt(invasion: number) {
  vi.mocked(stub.source_fits).mockReturnValue(typed<SourceFits>({
    hits: 412,
    ranked: [fit('ggd_mm', 412), fit('ezdrummer', 411), fit('ggd_rock', 409), fit('ggd_one', 405), fit('sd3', 404), fit('ggd_invasion', invasion)]
      .sort((a, b) => b.recognized - a.recognized),
  }));
}

const notice = () => screen.queryByText(/notes in your file aren't in the/);
const suggestions = () => within(notice()!.closest('p')!).getAllByRole('button').map((b) => b.textContent);

async function chooseRockFundamentals() {
  fitsWithInvasionAt(300);
  await startApp();
  await pickEngines();
  await addMidi('groove.mid');
  await userEvent.click(await screen.findByRole('button', { name: 'GGD Rock Fundamentals (409 notes)' }));
}

describe('the closer sources notice', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_catalog).mockReturnValue(ENGINES);
  });

  it('shows nothing before a file is added', async () => {
    fitsWithInvasionAt(300);
    await startApp();
    await pickEngines();
    expect(notice()).not.toBeInTheDocument();
    expect(stub.source_fits).not.toHaveBeenCalled();
  });

  it("says how many of the file's notes the source misses once a file is added", async () => {
    fitsWithInvasionAt(405);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    expect((await screen.findByText(/notes in your file aren't in the/)).closest('p')).toHaveTextContent(
      "7 of 412 notes in your file aren't in the GGD Invasion layout. Closer fits: GGD Modern & Massive (all notes) · GGD Rock Fundamentals (409 notes)",
    );
  });

  it('fits the files under the drum channel', async () => {
    fitsWithInvasionAt(405);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await screen.findByText(/notes in your file aren't in the/);
    expect(vi.mocked(stub.source_fits).mock.lastCall).toEqual([[new Uint8Array([1])], 'auto']);
  });

  it('suggests at most three engines, leaving out the target', async () => {
    fitsWithInvasionAt(300);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await screen.findByText(/notes in your file aren't in the/);
    expect(suggestions()).toEqual([
      'GGD Modern & Massive (all notes)',
      'GGD Rock Fundamentals (409 notes)',
      'GGD One Kit Wonder (405 notes)',
    ]);
  });

  it('makes a chosen suggestion the source', async () => {
    await chooseRockFundamentals();
    expect(screen.getAllByRole('option', { name: 'GGD Rock Fundamentals' })[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ranks again for the new source', async () => {
    await chooseRockFundamentals();
    expect(suggestions()).toEqual(['GGD Modern & Massive (all notes)']);
  });

  it('goes away once the source recognizes every note', async () => {
    fitsWithInvasionAt(300);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await userEvent.click(await screen.findByRole('button', { name: 'GGD Modern & Massive (all notes)' }));
    expect(notice()).not.toBeInTheDocument();
  });

  it('shows nothing when the source recognizes every note', async () => {
    fitsWithInvasionAt(412);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await vi.waitFor(() => expect(stub.source_fits).toHaveBeenCalled());
    expect(notice()).not.toBeInTheDocument();
  });
});
