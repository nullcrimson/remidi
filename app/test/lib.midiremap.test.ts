import { describe, expect, it } from 'vitest';
import { engines, plan, ready, remap } from '../src/lib/midiremap';
import * as stub from './stubs/wasm';
import { REMAP_BYTES } from './stubs/wasm';

describe('midiremap wrapper', () => {
  it('lists engines', async () => {
    await ready();
    const ids = engines().map((e) => e.id);
    expect([...ids].sort()).toEqual(['ezdrummer', 'ggd_invasion']);
    expect(engines().every((e) => typeof e.name === 'string' && e.name.length > 0)).toBe(true);
  });

  it('maps plan rows to camelCase', () => {
    const rows = plan('ggd_invasion', 'ezdrummer');
    const kick = rows.find((r) => r.canon === 'kick.main')!;
    expect(kick.srcNotes).toEqual([24]);
    expect(kick.tgtNote).toBe(36);
    expect(kick.defaultTgtNote).toBe(36);
    expect(rows.find((r) => r.canon === 'china.1.hit')!.tgtNote).toBeNull();
  });

  it('turns missing notes into null', () => {
    const cc = plan('ggd_invasion', 'ezdrummer').find((r) => r.canon === 'hat.cc')!;
    expect(cc.tgtNote).toBeNull();
    expect(cc.defaultTgtNote).toBeNull();
  });

  it('applies a target override to the plan', () => {
    const rows = plan('ggd_invasion', 'ezdrummer', {
      tgt: [{ canon: 'kick.main', note: 35 }],
      src: [],
    });
    expect(rows.find((r) => r.canon === 'kick.main')!.tgtNote).toBe(35);
  });

  it('applies a source override that rescues a note in the plan', () => {
    const rows = plan('ggd_invasion', 'ezdrummer', {
      tgt: [],
      src: [{ note: 60, canon: 'china.1.hit' }],
    });
    expect(rows.find((r) => r.canon === 'china.1.hit')!.srcNotes[0]).toBe(60);
  });

  it('passes remap bytes through and camelCases the report', () => {
    const out = remap(new Uint8Array([0]), 'ggd_invasion', 'ezdrummer');
    expect(out.bytes).toBe(REMAP_BYTES);
    expect(Array.from(out.bytes)).toEqual([77, 84, 104, 100]);
    expect(out.report.dropped).toEqual({ 'china.1.hit': 1 });
    expect(out.report.fallbackUsed).toEqual({ 'hat.open3': { note: 46, count: 2 } });
    expect(out.report.unmappedSource).toEqual({});
    expect(out.report.untouched).toBe(5);
    expect(out.report.converted).toBe(40);
  });

  it('passes the missing-drums choice to plan and maps other_drum', () => {
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
});
