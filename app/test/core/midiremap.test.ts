import { beforeAll, describe, expect, it, vi } from 'vitest';
import { WasmCallError } from '../../src/core/errors';
import { moduleLoader, type Midiremap, type Overrides } from '../../src/core/midiremap';
import * as stub from '../stubs/wasm';
import { enginePair, typed } from '../typed';
import { REMAP_BYTES } from '../stubs/wasm';

describe('midiremap wrapper', () => {
  let core: Midiremap;

  beforeAll(async () => {
    core = await moduleLoader()();
  });

  it('lists engines with their full names', () => {
    const ids = core.engines().map((e) => e.id);
    expect([...ids].sort()).toEqual(['ezdrummer', 'ggd_invasion']);
    expect(core.engines().every((e) => e.name.length > 0 && e.fullName.length > 0)).toBe(true);
  });

  it('returns plan rows as the module gives them', () => {
    const rows = core.plan(enginePair('ggd_invasion', 'ezdrummer'));
    const kick = rows.find((r) => r.canon === 'kick.main')!;
    expect(kick.srcNotes).toEqual([24]);
    expect(kick.outcome).toEqual({ status: 'direct', note: 36 });
    expect(kick.defaultTgtNote).toBe(36);
    expect(rows.find((r) => r.canon === 'china.1.hit')!.outcome.status).toBe('dropped');
  });

  it('passes overrides to the module as an object', () => {
    const ov = typed<Overrides>({ edits: { 'kick.main': 35 }, srcEdits: {} });
    core.plan(enginePair('ggd_invasion', 'ezdrummer'), ov);
    expect(vi.mocked(stub.plan).mock.lastCall?.[2]).toEqual(ov);
  });

  it('returns the plan the module made for the overrides', () => {
    const ov = typed<Overrides>({ edits: { 'kick.main': 35 }, srcEdits: {} });
    const rows = core.plan(enginePair('ggd_invasion', 'ezdrummer'), ov);
    expect(rows.find((r) => r.canon === 'kick.main')!.outcome).toEqual({ status: 'direct', note: 35 });
  });

  it('applies a source override that rescues a note in the plan', () => {
    const rows = core.plan(enginePair('ggd_invasion', 'ezdrummer'), typed<Overrides>({
      edits: {},
      srcEdits: { 60: 'china.1.hit' },
    }));
    expect(rows.find((r) => r.canon === 'china.1.hit')!.srcNotes[0]).toBe(60);
  });

  it('passes remap bytes and the report through', () => {
    const out = core.remap(new Uint8Array([0]), enginePair('ggd_invasion', 'ezdrummer'));
    expect(out.bytes).toBe(REMAP_BYTES);
    expect(out.report.dropped).toEqual({ 'china.1.hit': 1 });
    expect(out.report.fallbackUsed).toEqual({ 'hat.open3': { standIn: 'hat.open1', note: 46, count: 2 } });
    expect(out.report.unmappedSource).toEqual({});
    expect(out.report.untouched).toBe(5);
    expect(out.report.converted).toBe(40);
  });

  it('passes the missing-drums choice to plan', () => {
    core.plan(enginePair('ggd_invasion', 'ezdrummer'), undefined, 'drop');
    expect(vi.mocked(stub.plan).mock.lastCall?.[3]).toBe('drop');
  });

  it('returns the plan the module made for the missing-drums choice', () => {
    const rows = core.plan(enginePair('ggd_invasion', 'ezdrummer'), undefined, 'drop');
    expect(rows.find((r) => r.canon === 'china.1.hit')!.outcome).toEqual({ status: 'dropped', otherDrum: true });
    expect(rows.find((r) => r.canon === 'kick.main')!.outcome.status).toBe('direct');
  });

  it('passes the missing-drums choice drop to the converter', () => {
    core.remap(new Uint8Array([0]), enginePair('ggd_invasion', 'ezdrummer'), undefined, 'auto', 'drop');
    expect(vi.mocked(stub.remap).mock.lastCall?.[5]).toBe('drop');
  });

  it('passes the channel to the converter', () => {
    core.remap(new Uint8Array([0]), enginePair('ggd_invasion', 'ezdrummer'), undefined, '10');
    expect(vi.mocked(stub.remap).mock.lastCall?.[4]).toBe('10');
  });

  it('passes no channel to the converter when none is given', () => {
    core.remap(new Uint8Array([0]), enginePair('ggd_invasion', 'ezdrummer'));
    expect(vi.mocked(stub.remap).mock.lastCall?.[4]).toBeUndefined();
  });

  it('turns a thrown module error into an Error with its kind and id', () => {
    let err: unknown;
    try {
      core.engineDrums('nope');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(WasmCallError);
    expect(err).toBeInstanceOf(Error);
    expect((err as WasmCallError).error).toEqual({ kind: 'unknownEngine', role: 'target', id: 'nope' });
  });
});
