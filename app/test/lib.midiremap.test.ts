import { describe, expect, it } from 'vitest';
import { engineDrums, engines, plan, ready, remap, WasmCallError } from '../src/lib/midiremap';
import * as stub from './stubs/wasm';
import { REMAP_BYTES } from './stubs/wasm';

describe('midiremap wrapper', () => {
  it('lists engines with their full names', async () => {
    await ready();
    const ids = engines().map((e) => e.id);
    expect([...ids].sort()).toEqual(['ezdrummer', 'ggd_invasion']);
    expect(engines().every((e) => e.name.length > 0 && e.fullName.length > 0)).toBe(true);
  });

  it('returns plan rows as the module gives them', () => {
    const rows = plan('ggd_invasion', 'ezdrummer');
    const kick = rows.find((r) => r.canon === 'kick.main')!;
    expect(kick.srcNotes).toEqual([24]);
    expect(kick.tgtNote).toBe(36);
    expect(kick.defaultTgtNote).toBe(36);
    expect(rows.find((r) => r.canon === 'china.1.hit')!.tgtNote).toBeNull();
  });

  it('passes overrides to the module as an object', () => {
    const ov = { tgt: [{ canon: 'kick.main', note: 35 }], src: [] };
    const rows = plan('ggd_invasion', 'ezdrummer', ov);
    expect(stub.lastPlanOverrides).toEqual(ov);
    expect(rows.find((r) => r.canon === 'kick.main')!.tgtNote).toBe(35);
  });

  it('applies a source override that rescues a note in the plan', () => {
    const rows = plan('ggd_invasion', 'ezdrummer', {
      tgt: [],
      src: [{ note: 60, canon: 'china.1.hit' }],
    });
    expect(rows.find((r) => r.canon === 'china.1.hit')!.srcNotes[0]).toBe(60);
  });

  it('passes remap bytes and the report through', () => {
    const out = remap(new Uint8Array([0]), 'ggd_invasion', 'ezdrummer');
    expect(out.bytes).toBe(REMAP_BYTES);
    expect(out.report.dropped).toEqual({ 'china.1.hit': 1 });
    expect(out.report.fallbackUsed).toEqual({ 'hat.open3': { note: 46, count: 2 } });
    expect(out.report.unmappedSource).toEqual({});
    expect(out.report.untouched).toBe(5);
    expect(out.report.converted).toBe(40);
  });

  it('passes the missing-drums choice to plan', () => {
    const rows = plan('ggd_invasion', 'ezdrummer', undefined, 'drop');
    expect(stub.lastPlanMissing).toBe('drop');
    expect(rows.find((r) => r.canon === 'china.1.hit')!.otherDrum).toBe(true);
    expect(rows.find((r) => r.canon === 'kick.main')!.otherDrum).toBe(false);
  });

  it('passes the missing-drums choice to the converter', () => {
    remap(new Uint8Array([0]), 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'drop');
    expect(stub.lastRemapMissing).toBe('drop');
    remap(new Uint8Array([0]), 'ggd_invasion', 'ezdrummer', undefined, 'auto', 'nearest');
    expect(stub.lastRemapMissing).toBe('nearest');
  });

  it('passes the channel to the converter', () => {
    remap(new Uint8Array([0]), 'ggd_invasion', 'ezdrummer', undefined, '10');
    expect(stub.lastRemapChannel).toBe('10');
    remap(new Uint8Array([0]), 'ggd_invasion', 'ezdrummer');
    expect(stub.lastRemapChannel).toBeUndefined();
  });

  it('turns a thrown module error into an Error with its kind and id', () => {
    let err: unknown;
    try {
      engineDrums('nope');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(WasmCallError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({ message: "unknown target engine 'nope'", kind: 'unknownEngine', id: 'nope' });
  });
});
