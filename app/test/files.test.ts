import { describe, expect, it } from 'vitest';
import { splitFiles } from '../src/lib/files';

const file = (name: string) => new File(['x'], name);

describe('splitFiles', () => {
  it('routes MIDI files, preset files and the rest', () => {
    const { mid, presets, skipped } = splitFiles([
      file('groove.mid'),
      file('fill.MIDI'),
      file('kit.drumverter.json'),
      file('notes.txt'),
    ]);
    expect(mid.map((f) => f.name)).toEqual(['groove.mid', 'fill.MIDI']);
    expect(presets.map((f) => f.name)).toEqual(['kit.drumverter.json']);
    expect(skipped).toEqual(['notes.txt']);
  });
});
