import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { noteName } from '../src/lib/notes';
import FIXTURE from './fixtures/my-kit.drumverter.json?raw';
import * as stub from './stubs/wasm';

type Wasm = typeof import('../src/wasm/midiremap_wasm.js');

const binary = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wasm', 'midiremap_wasm_bg.wasm');

const MIDI = new Uint8Array([
  0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 0x60,
  0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 0x14,
  0x00, 0x99, 0x18, 0x64, 0x30, 0x89, 0x18, 0x00,
  0x00, 0x99, 0x1a, 0x64, 0x30, 0x89, 0x1a, 0x00,
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

describe('real WASM module', () => {
  it('lists engines with id, name and full name', () => {
    const engines = real.engine_catalog();
    expect(engines.length).toBeGreaterThan(50);
    const ezd = engines.find((e) => e.id === 'ezdrummer')!;
    expect(ezd).toEqual({ id: 'ezdrummer', name: 'EZdrummer 3', fullName: 'Toontrack EZdrummer 3' });
  });

  it('plans a pair with camelCase rows, null for no note and the three statuses', () => {
    const rows = real.plan('ggd_invasion', 'ezdrummer', undefined, 'drop');
    const kick = rows.find((r) => r.canon === 'kick.main')!;
    expect(keys(kick)).toEqual(['canon', 'defaultTgtNote', 'label', 'outcome', 'srcNotes']);
    expect(kick.outcome).toEqual({ status: 'direct', tgtNote: 36 });
    const china = rows.find((r) => r.canon === 'china.1.hit')!;
    expect(china.outcome).toEqual({ status: 'dropped', otherDrum: true });
    expect(china.defaultTgtNote).toBeNull();
    expect(new Set(rows.map((r) => r.outcome.status))).toEqual(new Set(['direct', 'fallback', 'dropped']));
  });

  it('applies target and source overrides passed as an object', () => {
    const rows = real.plan('ggd_invasion', 'ezdrummer', {
      tgt: [{ canon: 'kick.main', note: 35 }],
      src: [{ note: 127, canon: 'china.1.hit' }],
    });
    const kick = rows.find((r) => r.canon === 'kick.main')!;
    expect(kick.outcome).toEqual({ status: 'direct', tgtNote: 35 });
    expect(kick.defaultTgtNote).toBe(36);
    expect(rows.find((r) => r.canon === 'china.1.hit')!.srcNotes[0]).toBe(127);
  });

  it('converts a file into bytes and a camelCase report', () => {
    const out = real.remap(MIDI, 'ggd_invasion', 'ezdrummer');
    expect(out.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(out.bytes.slice(0, 4))).toEqual([0x4d, 0x54, 0x68, 0x64]);
    expect(keys(out.report)).toEqual(['converted', 'dropped', 'fallbackUsed', 'unmappedSource', 'untouched']);
    expect(out.report.converted).toBe(2);
  });

  it('reads the shared preset fixture', () => {
    expect(real.parse_preset_file(FIXTURE)).toEqual({
      name: 'My kit',
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: { 'kick.main': 35, 'china.1.hit': 52 },
      srcEdits: { 24: 'snare1.hit', 60: null },
      skipped: [],
    });
  });

  it('lists the drum families in display order', () => {
    expect(real.family_order()).toEqual(['Kick', 'Snare', 'Toms', 'Hi-Hat', 'Cymbals', 'Percussion', 'Aux']);
    const families = new Set(real.family_order());
    expect(real.canon_catalog().every((c) => families.has(c.family))).toBe(true);
  });

  it('names every note the way the app does, in both octave conventions', () => {
    for (const base of ['c1', 'c2'] as const) {
      const app = Array.from({ length: 128 }, (_, n) => noteName(n, base));
      expect(app).toEqual(real.note_names(base));
    }
  });

  it('throws typed errors', () => {
    expect(thrown(() => real.engine_drums('nope'))).toEqual({
      kind: 'unknownEngine',
      role: 'target',
      id: 'nope',
    });
    const kind = (f: () => unknown) => (thrown(f) as { kind: string }).kind;
    expect(kind(() => real.remap(new Uint8Array([1, 2]), 'ggd_invasion', 'ezdrummer'))).toBe('badMidi');
    expect(kind(() => real.remap(MIDI, 'ggd_invasion', 'ezdrummer', undefined, '17'))).toBe('badChannel');
    expect(kind(() => real.plan('ggd_invasion', 'ezdrummer', { tgt: [{ canon: 'bogus', note: 1 }] }))).toBe(
      'badOverrides',
    );
    expect(kind(() => real.plan('ggd_invasion', 'ezdrummer', undefined, 'maybe' as never))).toBe('badMissing');
    expect(kind(() => real.parse_preset_file('{}'))).toBe('badPreset');
  });
});

describe('test stub', () => {
  it('returns the same fields as the real module', () => {
    const first = <T extends object>(xs: T[]) => keys(xs[0]);
    expect(first(stub.engine_catalog())).toEqual(first(real.engine_catalog()));
    expect(first(stub.engine_drums('ezdrummer'))).toEqual(first(real.engine_drums('ezdrummer')));
    expect(first(stub.engine_notes('ggd_invasion'))).toEqual(first(real.engine_notes('ggd_invasion')));
    expect(first(stub.canon_catalog())).toEqual(first(real.canon_catalog()));
    expect(first(stub.plan('ggd_invasion', 'ezdrummer'))).toEqual(first(real.plan('ggd_invasion', 'ezdrummer')));
    expect(keys(stub.parse_preset_file(FIXTURE))).toEqual(keys(real.parse_preset_file(FIXTURE)));
    expect(stub.family_order()).toEqual(real.family_order());
    expect(stub.note_names('c2')).toEqual(real.note_names('c2'));
    const [s, r] = [stub.remap(MIDI, 'ggd_invasion', 'ezdrummer'), real.remap(MIDI, 'ggd_invasion', 'ezdrummer')];
    expect(keys(s)).toEqual(keys(r));
    expect(keys(s.report)).toEqual(keys(r.report));
  });

  it('uses only drum keys the real vocabulary has, with its labels and families', () => {
    const vocabulary = new Map(real.canon_catalog().map((c) => [c.canon, c]));
    const report = stub.remap(MIDI, 'ggd_invasion', 'ezdrummer').report;
    const used = [
      ...stub.engine_drums('ezdrummer').map((d) => d.canon),
      ...stub.engine_notes('ggd_invasion').map((d) => d.canon),
      ...stub.canon_catalog().map((c) => c.canon),
      ...stub.plan('ggd_invasion', 'ezdrummer').map((r) => r.canon),
      ...Object.keys(report.fallbackUsed),
      ...Object.keys(report.dropped),
    ];
    expect(used.filter((c) => !vocabulary.has(c))).toEqual([]);
    for (const c of stub.canon_catalog()) expect(c).toEqual(vocabulary.get(c.canon));
  });
});
