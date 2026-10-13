import { describe, expect, it, vi } from 'vitest';
import { ACCEPT_EXTENSIONS, splitFiles, takeFiles, withoutMidExtension } from '../../src/core/files';

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

describe('ACCEPT_EXTENSIONS', () => {
  it('names only extensions that splitFiles takes in', () => {
    const { skipped } = splitFiles(ACCEPT_EXTENSIONS.split(',').map((ext) => file(`a${ext}`)));
    expect(skipped).toEqual([]);
  });
});

describe('withoutMidExtension', () => {
  it('drops .mid in any case', () => {
    expect(withoutMidExtension('Groove.MID')).toBe('Groove');
  });

  it('drops .midi', () => {
    expect(withoutMidExtension('groove.midi')).toBe('groove');
  });

  it('leaves another name alone', () => {
    expect(withoutMidExtension('groove.txt')).toBe('groove.txt');
  });
});

function unreadable(name: string): File {
  const f = new File(['x'], name);
  const fail = () => Promise.reject(new DOMException('gone', 'NotReadableError'));
  Object.defineProperty(f, 'arrayBuffer', { value: fail });
  Object.defineProperty(f, 'text', { value: fail });
  return f;
}

describe('takeFiles', () => {
  it('reads the files it can and names the ones the browser cannot read', async () => {
    const onFiles = vi.fn();
    await takeFiles(
      [file('groove.mid'), unreadable('gone.mid'), file('kit.drumverter.json'), unreadable('lost.drumverter.json')],
      onFiles,
    );
    const [loaded, skipped, presets, failed] = onFiles.mock.calls[0];
    expect(loaded.map((f: { name: string }) => f.name)).toEqual(['groove.mid']);
    expect(skipped).toEqual([]);
    expect(presets).toEqual([{ name: 'kit.drumverter.json', text: 'x' }]);
    expect(failed).toEqual(['gone.mid', 'lost.drumverter.json']);
  });
});
