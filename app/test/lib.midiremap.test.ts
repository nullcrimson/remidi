import { describe, expect, it } from 'vitest';
import { engines, plan, ready, remap } from '../src/lib/midiremap';

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
    expect(kick.srcNote).toBe(24);
    expect(kick.tgtNote).toBe(36);
    expect(rows.find((r) => r.canon === 'china.1.hit')!.tgtNote).toBeNull();
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
    expect(rows.find((r) => r.canon === 'china.1.hit')!.srcNote).toBe(60);
  });

  it('normalizes remap bytes and camelCases the report', () => {
    const out = remap(new Uint8Array([0]), 'ggd_invasion', 'ezdrummer');
    expect(out.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(out.bytes)).toEqual([77, 84, 104, 100]);
    expect(out.report.dropped).toEqual({ 'china.1.hit': 1 });
    expect(out.report.fallbackUsed).toEqual({ 'hat.open3': 2 });
    expect(out.report.unmappedSource).toEqual({});
  });
});
