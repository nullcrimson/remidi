import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Conversion, Engine, Lacks } from '../src/core/midiremap';
import * as stub from './stubs/wasm';
import { addMidi, convert, convertButton, MY_KIT, pickEngines, startApp, storePresets } from './eventSteps';
import { advisedOf, typed } from './typed';

/** The engines the source advice tests pick from. */
export const SOURCE_ENGINES = typed<Engine[]>([
  { id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GetGood Drums Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer', fullName: 'Toontrack EZdrummer 3' },
  { id: 'ggd_mm', name: 'GGD Modern & Massive', fullName: 'GetGood Drums Modern & Massive' },
  { id: 'ggd_rock', name: 'GGD Rock Fundamentals', fullName: 'GetGood Drums Rock Fundamentals' },
  { id: 'ggd_one', name: 'GGD One Kit Wonder', fullName: 'GetGood Drums One Kit Wonder' },
  { id: 'sd3', name: 'Superior Drummer 3', fullName: 'Toontrack Superior Drummer 3' },
]);

/** What one source recognizes of the hits, and the engine the advice names: another engine, or the target. */
export interface SourceAdviceOf {
  own: number;
  engine: string | 'target';
  recognized: number;
  ask?: Lacks;
}

/**
 * Advises as `table` says, by `source>target` or else by source alone; a source the table
 * leaves out fits.
 */
export function advises(hits: number, table: Record<string, SourceAdviceOf>) {
  vi.mocked(stub.source_advice).mockImplementation((_files, src, tgt = null) => {
    const advice = table[`${src}>${tgt}`] ?? table[src];
    if (advice === undefined) return advisedOf(src, tgt, { kind: 'fits' });
    const { own, engine, recognized, ask = null } = advice;
    const missed = { missing: hits - own, hits, recognized, ask };
    if (engine !== 'target') return advisedOf(src, tgt, { kind: 'suggest', engine, ...missed });
    if (tgt === null) throw new Error(`advice naming the target for ${src} without one`);
    return advisedOf(src, tgt, { kind: 'looksLikeTarget', ...missed });
  });
}

/**
 * Advice on 412 hits for EZdrummer, the target, where GGD Invasion, the source picked,
 * recognizes `invasion`, and GGD Modern & Massive, suggested to every other source, every hit.
 */
export function fitsWithInvasionAt(invasion: number) {
  const others = { ggd_rock: 409, ggd_one: 405, sd3: 404, ggd_invasion: invasion };
  advises(412, Object.fromEntries(Object.entries(others)
    .filter(([, own]) => own < 412)
    .map(([source, own]) => [source, { own, engine: 'ggd_mm', recognized: 412 }])));
}

/** Advice where the target, EZdrummer, recognizes every hit of the file GGD Invasion misses part of. */
function fitsTheTarget() {
  advises(412, { 'ggd_invasion>ezdrummer': { own: 300, engine: 'target', recognized: 412 } });
}

/** Every conversion removes 112 of 412 hits as unrecognized. */
export function convertsWithUnrecognized() {
  vi.mocked(stub.remap).mockReturnValue(typed<Conversion>({ kind: 'done', picked: [], offers: [],
    bytes: new Uint8Array([1]),
    damage: [],
    report: { unmappedSource: { 51: { hits: 112, fate: 'removed' } }, fallbackUsed: {}, dropped: {}, untouched: 0, converted: 300, merged: 0, read: 412, lost: 112 },
  }));
}

/** Converts a file with the stored preset My kit open, its target edits applied. */
export async function convertMyKit() {
  storePresets(MY_KIT);
  fitsWithInvasionAt(300);
  await startApp();
  await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
  await addMidi('groove.mid');
  await convert();
}

/** Converts a file the source misses part of, then the other way from the done card's target line. */
export async function convertTheOtherWay() {
  fitsTheTarget();
  await startApp();
  await pickEngines();
  await addMidi('groove.mid');
  await convert();
  await userEvent.click(screen.getByRole('button', { name: 'Convert the other way: EZdrummer → GGD Invasion' }));
  await screen.findByText('Read as EZdrummer.');
}

/** The question Convert asks for a file GGD Invasion reads no kit in. */
export const ASK_SENTENCE = "GGD Invasion finds no kick and no snare in your file and doesn't know 16 of its 48 notes. GGD Modern & Massive knows every note.";

/** Advice on 48 hits where the source, GGD Invasion, reads no kick and no snare and misses a third of them. */
export function fitsThatAsk() {
  advises(48, {
    ggd_invasion: { own: 32, engine: 'ggd_mm', recognized: 48, ask: 'kickAndSnare' },
    ggd_rock: { own: 40, engine: 'ggd_mm', recognized: 48 },
  });
}

/** Advice on 48 hits where the target, EZdrummer, recognizes every one and GGD Invasion, the source, misses a third and reads no kick and no snare. */
export function fitsTheTargetAndAsks() {
  advises(48, { 'ggd_invasion>ezdrummer': { own: 32, engine: 'target', recognized: 48, ask: 'kickAndSnare' } });
}

/** The question Convert asks for a file the target knows every note of. */
export const TARGET_ASK_SENTENCE = "GGD Invasion finds no kick and no snare in your file and doesn't know 16 of its 48 notes. EZdrummer knows every note: your file may already be in its layout.";

/** Clicks Convert on such a file and waits for the question. */
export async function ask() {
  await startApp();
  await pickEngines();
  await addMidi('groove.mid');
  await screen.findByText(/ notes in your file\.$/);
  await userEvent.click(convertButton());
  await screen.findByRole('group', { name: ASK_SENTENCE });
}

/** The engine chosen on one side. */
export const chosen = (side: 'FROM' | 'TO') => within(screen.getByRole('group', { name: `${side} engine` })).getByTestId('chosen-engine');
