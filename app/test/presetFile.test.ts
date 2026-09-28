import { describe, expect, it } from 'vitest';
import { presetFileName, toPresetFile, uniqueName } from '../src/lib/presetFile';
import fixture from './fixtures/my-kit.drumverter.json?raw';

describe('preset file', () => {
  it('exports exactly the file the CLI and core read', () => {
    const text = toPresetFile({
      name: 'My kit',
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: { 'kick.main': 35, 'china.1.hit': 52 },
      srcEdits: { 24: 'snare1.hit', 60: null },
    });
    expect(text).toBe(fixture.replace(/\r\n/g, '\n'));
  });

  it('names the file after the preset', () => {
    expect(presetFileName('My kit')).toBe('my-kit.drumverter.json');
    expect(presetFileName('  GGD → EZD (live)! ')).toBe('ggd-ezd-live.drumverter.json');
    expect(presetFileName('→→')).toBe('preset.drumverter.json');
  });

  it('picks a free name for an import', () => {
    expect(uniqueName('Kit', [])).toBe('Kit');
    expect(uniqueName('Kit', ['Kit'])).toBe('Kit copy');
    expect(uniqueName('Kit', ['Kit', 'Kit copy'])).toBe('Kit copy 2');
  });
});
