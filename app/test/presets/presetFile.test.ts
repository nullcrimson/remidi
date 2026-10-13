import { describe, expect, it } from 'vitest';
import { presetFileName, toPresetFile } from '../../src/presets/presetFile';
import { presetName, typed } from '../typed';
import { PRESET_FIXTURE } from '../presetFixture';

describe('preset file', () => {
  it('exports exactly the file the CLI and core read', () => {
    const text = toPresetFile(typed<Parameters<typeof toPresetFile>[0]>({
      name: presetName('My kit'),
      src: 'ggd_invasion',
      tgt: 'ezdrummer',
      edits: { 'kick.main': 35, 'china.1.hit': 52 },
      srcEdits: { 24: 'snare1.hit', 60: null },
    }));
    expect(text).toBe(PRESET_FIXTURE.replace(/\r\n/g, '\n'));
  });

  it('names the file after the preset', () => {
    expect(presetFileName('My kit')).toBe('my-kit-drumverter.json');
  });

  it('leaves punctuation and edge spaces out of the file name', () => {
    expect(presetFileName('  GGD → EZD (live)! ')).toBe('ggd-ezd-live-drumverter.json');
  });

  it('names the file preset when the name has no letters or digits', () => {
    expect(presetFileName('→→')).toBe('preset-drumverter.json');
  });
});
