import { unzipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { zipFiles } from '../../src/convert/zip';

describe('zipFiles', () => {
  it('bundles named byte entries into a zip blob', async () => {
    const blob = zipFiles([
      { name: 'a.mid', bytes: strToU8('AAA') },
      { name: 'b.mid', bytes: strToU8('BBB') },
    ]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const files = unzipSync(buf);
    expect(Object.keys(files).sort()).toEqual(['a.mid', 'b.mid']);
    expect(Array.from(files['a.mid'])).toEqual(Array.from(strToU8('AAA')));
  });
});
