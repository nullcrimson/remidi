import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Overrides } from '../src/core/midiremap';
import naming from '../src/wasm/note_naming.json';
import { PRESET_FIXTURE } from './presetFixture';
import * as stub from './stubs/wasm';
import { canon, presetName, typed } from './typed';

type Wasm = typeof import('../src/wasm/midiremap_wasm.js');

const binary = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wasm', 'midiremap_wasm_bg.wasm');

const MIDI = new Uint8Array([
  0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 0x60,
  0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 0x14,
  0x00, 0x99, 0x18, 0x64, 0x30, 0x89, 0x18, 0x00,
  0x00, 0x99, 0x1a, 0x64, 0x30, 0x89, 0x1a, 0x00,
  0x00, 0xff, 0x2f, 0x00,
]);

const CHINA_MIDI = new Uint8Array([
  0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 0x60,
  0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 0x0c,
  0x00, 0x99, 0x41, 0x64, 0x30, 0x89, 0x41, 0x00,
  0x00, 0xff, 0x2f, 0x00,
]);

const UNKNOWN_MIDI = new Uint8Array([
  0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 0x60,
  0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 0x0c,
  0x00, 0x99, 0x63, 0x64, 0x30, 0x89, 0x63, 0x00,
  0x00, 0xff, 0x2f, 0x00,
]);

let real: Wasm;

beforeAll(async () => {
  if (!existsSync(binary)) throw new Error('The built WASM module is missing; run npm run build:wasm');
  real = await import('../src/wasm/midiremap_wasm.js');
  real.initSync({ module: readFileSync(binary) });
});

function thrown(f: () => unknown): unknown {
  try {
    f();
  } catch (err) {
    return err;
  }
  throw new Error('expected a throw');
}

const keys = (o: object) => Object.keys(o).sort();
const kind = (f: () => unknown) => (thrown(f) as { kind: string }).kind;
const first = <T extends object>(xs: T[]) => keys(xs[0]);

describe('real WASM module', () => {
  it('lists the engines', () => {
    const engines = real.engine_catalog();
    expect(engines.length).toBeGreaterThan(50);
  });

  it('gives an engine its id, name and full name', () => {
    const engines = real.engine_catalog();
    const ezd = engines.find((e) => e.id === 'ezdrummer')!;
    expect(ezd).toEqual({ id: 'ezdrummer', name: 'EZdrummer 3', fullName: 'Toontrack EZdrummer 3' });
  });

  it('plans a pair with camelCase rows', () => {
    const rows = real.plan('ggd_invasion', 'ezdrummer', undefined, 'drop');
    const kick = rows.find((r) => r.canon === 'kick.main')!;
    expect(keys(kick)).toEqual(['canon', 'defaultTgtNote', 'family', 'label', 'outcome', 'srcNotes']);
    expect(kick.outcome).toEqual({ status: 'direct', tgtNote: 36 });
  });

  it('plans null for no note', () => {
    const rows = real.plan('ggd_invasion', 'ezdrummer', undefined, 'drop');
    const china = rows.find((r) => r.canon === 'china.1.hit')!;
    expect(china.outcome).toEqual({ status: 'dropped', otherDrum: true });
    expect(china.defaultTgtNote).toBeNull();
  });

  it('plans the stand-in of a swapped drum', () => {
    const rows = real.plan('ggd_invasion', 'ezdrummer');
    const china = rows.find((r) => r.canon === 'china.1.hit')!;
    expect(china.outcome).toEqual({ status: 'fallback', standIn: 'crash.1.hit', tgtNote: 86, otherDrum: true });
  });

  it('plans the three statuses', () => {
    const rows = real.plan('ggd_invasion', 'ezdrummer', undefined, 'drop');
    expect(new Set(rows.map((r) => r.outcome.status))).toEqual(new Set(['direct', 'fallback', 'dropped']));
  });

  const overridden = () => real.plan('ggd_invasion', 'ezdrummer', typed<Overrides>({
    tgt: [{ canon: 'kick.main', note: 35 }],
    src: [{ note: 127, canon: 'china.1.hit' }],
  }));

  it('applies target overrides passed as an object', () => {
    const rows = overridden();
    const kick = rows.find((r) => r.canon === 'kick.main')!;
    expect(kick.outcome).toEqual({ status: 'direct', tgtNote: 35 });
    expect(kick.defaultTgtNote).toBe(36);
  });

  it('applies source overrides passed as an object', () => {
    const rows = overridden();
    expect(rows.find((r) => r.canon === 'china.1.hit')!.srcNotes[0]).toBe(127);
  });

  it('converts a file into MIDI bytes', () => {
    const out = real.remap(MIDI, 'ggd_invasion', 'ezdrummer');
    expect(out.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(out.bytes.slice(0, 4))).toEqual([0x4d, 0x54, 0x68, 0x64]);
  });

  it('reports a conversion with a camelCase report', () => {
    const out = real.remap(MIDI, 'ggd_invasion', 'ezdrummer');
    expect(keys(out.report)).toEqual(['converted', 'dropped', 'fallbackUsed', 'unmappedSource', 'untouched']);
    expect(out.report.converted).toBe(2);
  });

  it('keeps a note the source layout does not recognize when told to', () => {
    const out = real.remap(UNKNOWN_MIDI, 'ggd_invasion', 'ezdrummer', undefined, undefined, undefined, 'keep');
    expect(Array.from(out.bytes)).toEqual(Array.from(UNKNOWN_MIDI));
  });

  it('removes a note the source layout does not recognize by default', () => {
    const out = real.remap(UNKNOWN_MIDI, 'ggd_invasion', 'ezdrummer');
    expect(Array.from(out.bytes)).not.toEqual(Array.from(UNKNOWN_MIDI));
  });

  it('reports a kept note as unrecognized', () => {
    const out = real.remap(UNKNOWN_MIDI, 'ggd_invasion', 'ezdrummer', undefined, undefined, undefined, 'keep');
    expect(out.report.unmappedSource).toEqual({ 99: 1 });
  });

  it('reports the stand-in a swapped drum played on', () => {
    const out = real.remap(CHINA_MIDI, 'ggd_invasion', 'ezdrummer');
    expect(out.report.fallbackUsed).toEqual({ 'china.1.hit': { standIn: 'crash.1.hit', note: 86, count: 1 } });
  });

  it('reads the shared preset fixture', () => {
    expect(real.parse_preset_file(PRESET_FIXTURE)).toEqual({
      name: 'My kit',
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: { 'kick.main': 35, 'china.1.hit': 52 },
      srcEdits: { 24: 'snare1.hit', 60: null },
      skipped: [],
    });
  });

  it('fits every engine to the hits of the files, best first', () => {
    const { hits, ranked } = real.source_fits([MIDI, CHINA_MIDI], 'auto');
    expect(ranked).toHaveLength(real.engine_catalog().length);
    expect([hits, ranked.find((f) => f.engine === 'ggd_invasion')]).toEqual([3, { engine: 'ggd_invasion', recognized: 3 }]);
    expect(ranked.map((f) => f.recognized)).toEqual(ranked.map((f) => f.recognized).sort((a, b) => b - a));
  });

  it('leaves a file that does not parse out of a fit', () => {
    expect(real.source_fits([MIDI, new Uint8Array([1, 2])], 'auto').hits).toBe(2);
  });

  it('builds a sample groove whose every hit the engine it was built for recognizes', () => {
    const { hits, ranked } = real.source_fits([real.sample_file('ggd_invasion')], 'auto');
    expect(hits).toBeGreaterThan(0);
    expect(ranked.find((f) => f.engine === 'ggd_invasion')?.recognized).toBe(hits);
  });

  it('throws a typed error for a sample of an unknown engine', () => {
    expect(thrown(() => real.sample_file('nope'))).toEqual({ kind: 'unknownEngine', role: 'source', id: 'nope' });
  });

  it('lists the drum families in display order', () => {
    expect(real.family_order()).toEqual(['Kick', 'Snare', 'Toms', 'Hi-Hat', 'Cymbals', 'Percussion', 'Aux']);
  });

  it('gives every drum of the vocabulary a listed family', () => {
    const families = new Set(real.family_order());
    expect(real.canon_catalog().every((c) => families.has(c.family))).toBe(true);
  });

  it('built the note naming table the app reads from this module', () => {
    expect(naming).toEqual(real.note_naming());
  });

  it('throws a typed error for an unknown engine', () => {
    expect(thrown(() => real.engine_drums('nope'))).toEqual({
      kind: 'unknownEngine',
      role: 'target',
      id: 'nope',
    });
  });

  it('throws a typed error for a bad MIDI file', () => {
    expect(kind(() => real.remap(new Uint8Array([1, 2]), 'ggd_invasion', 'ezdrummer'))).toBe('badMidi');
  });

  it('throws a typed error for a bad channel', () => {
    expect(kind(() => real.remap(MIDI, 'ggd_invasion', 'ezdrummer', undefined, '17' as never))).toBe('internal');
  });

  it('throws an internal error for an unrecognized-notes choice the app never sends', () => {
    expect(kind(() => real.remap(MIDI, 'ggd_invasion', 'ezdrummer', undefined, undefined, undefined, 'maybe' as never))).toBe('internal');
  });

  it('throws a typed error for bad overrides', () => {
    expect(kind(() => real.plan('ggd_invasion', 'ezdrummer', typed<Overrides>({ tgt: [{ canon: 'bogus', note: 1 }] })))).toBe(
      'badOverrides',
    );
  });

  it('throws a typed error for a bad missing-drums choice', () => {
    expect(kind(() => real.plan('ggd_invasion', 'ezdrummer', undefined, 'maybe' as never))).toBe('badMissing');
  });

  it('throws a typed error for a bad preset', () => {
    expect(kind(() => real.parse_preset_file('{}'))).toBe('badPreset');
  });

  it('names a rack after its pair and packs it as gzip', () => {
    const rack = real.remap_rack('ggd_invasion', 'ezdrummer');
    expect([rack.fileName, rack.packing, rack.xml.startsWith('<?xml')]).toEqual([
      'GetGood Drums Invasion to EZdrummer 3.adg',
      'gzip',
      true,
    ]);
  });

  it('names a preset rack after the preset', () => {
    expect(real.remap_rack('ggd_invasion', 'ezdrummer', undefined, undefined, undefined, presetName('My kit')).fileName).toBe('My kit.adg');
  });

  it('gives a rack that keeps unknown notes more chains than one that removes them', () => {
    const chains = (unrecognized: 'keep' | 'remove') =>
      real.remap_rack('ggd_invasion', 'ezdrummer', undefined, undefined, unrecognized).xml.split('<MidiEffectBranchPreset ').length;
    expect(chains('keep')).toBeGreaterThan(chains('remove'));
  });

  it('counts the drums a rack leaves silent', () => {
    expect(real.remap_rack('superior_drummer3', 'general_midi', undefined, 'drop').dropped).toBeGreaterThan(0);
    expect(real.remap_rack('ggd_invasion', 'ezdrummer', undefined, 'nearest').dropped).toBe(0);
  });

  it('throws a typed error for a rack of an unknown engine', () => {
    expect(thrown(() => real.remap_rack('ggd_invasion', 'nope'))).toEqual({ kind: 'unknownEngine', role: 'target', id: 'nope' });
  });

  it('refuses a blank preset name for a rack', () => {
    expect(kind(() => real.remap_rack('ggd_invasion', 'ezdrummer', undefined, undefined, undefined, ' ' as never))).toBe('badPreset');
  });
});

describe('test stub', () => {
  it('returns the same engine catalog fields as the real module', () => {
    expect(first(stub.engine_catalog())).toEqual(first(real.engine_catalog()));
  });

  it('returns the same engine drum fields as the real module', () => {
    expect(first(stub.engine_drums('ezdrummer'))).toEqual(first(real.engine_drums('ezdrummer')));
  });

  it('returns the same engine note fields as the real module', () => {
    expect(first(stub.engine_notes('ggd_invasion'))).toEqual(first(real.engine_notes('ggd_invasion')));
  });

  it('returns the same canon catalog fields as the real module', () => {
    expect(first(stub.canon_catalog())).toEqual(first(real.canon_catalog()));
  });

  it('returns the same plan row fields as the real module', () => {
    expect(first(stub.plan('ggd_invasion', 'ezdrummer'))).toEqual(first(real.plan('ggd_invasion', 'ezdrummer')));
  });

  it('returns the same preset fields as the real module', () => {
    expect(keys(stub.parse_preset_file(PRESET_FIXTURE))).toEqual(keys(real.parse_preset_file(PRESET_FIXTURE)));
  });

  it('returns the same family order as the real module', () => {
    expect(stub.family_order()).toEqual(real.family_order());
  });

  it('returns the same remap fields as the real module', () => {
    const [s, r] = [stub.remap(MIDI, 'ggd_invasion', 'ezdrummer'), real.remap(MIDI, 'ggd_invasion', 'ezdrummer')];
    expect(keys(s)).toEqual(keys(r));
    expect(keys(s.report)).toEqual(keys(r.report));
  });

  it('returns the same rack fields as the real module', () => {
    const [s, r] = [stub.remap_rack('ggd_invasion', 'ezdrummer'), real.remap_rack('ggd_invasion', 'ezdrummer')];
    expect([keys(s), s.packing]).toEqual([keys(r), r.packing]);
  });

  it('throws the same error for a rack of an unknown engine as the real module', () => {
    expect(thrown(() => stub.remap_rack('ggd_invasion', 'nope'))).toEqual(thrown(() => real.remap_rack('ggd_invasion', 'nope')));
  });

  it('returns a sample as bytes, as the real module does', () => {
    const [s, r] = [stub.sample_file('ggd_invasion'), real.sample_file('ggd_invasion')];
    expect([s.constructor, Array.from(s.slice(0, 4))]).toEqual([r.constructor, Array.from(r.slice(0, 4))]);
  });

  it('throws the same error for a sample of an unknown engine as the real module', () => {
    expect(thrown(() => stub.sample_file('nope'))).toEqual(thrown(() => real.sample_file('nope')));
  });

  it('uses only drum keys the real vocabulary has', () => {
    const vocabulary = new Map(real.canon_catalog().map((c) => [c.canon, c]));
    const report = stub.remap(MIDI, 'ggd_invasion', 'ezdrummer').report;
    const used = [
      ...stub.engine_drums('ezdrummer').map((d) => d.canon),
      ...stub.engine_notes('ggd_invasion').map((d) => d.canon),
      ...stub.canon_catalog().map((c) => c.canon),
      ...stub.plan('ggd_invasion', 'ezdrummer').map((r) => r.canon),
      ...Object.keys(report.fallbackUsed),
      ...Object.values(report.fallbackUsed).map((tally) => tally.standIn),
      ...Object.keys(report.dropped),
    ];
    expect(used.filter((c) => !vocabulary.has(canon(c)))).toEqual([]);
  });

  it('uses the real vocabulary labels and families', () => {
    const vocabulary = new Map(real.canon_catalog().map((c) => [c.canon, c]));
    for (const c of stub.canon_catalog()) expect(c).toEqual(vocabulary.get(c.canon));
  });
});
