import { describe, expect, it } from 'vitest';
import { localeChunkName } from '../scripts/localeChunk';

describe('locale chunk names', () => {
  it('names a locale\'s messages after its code', () => {
    expect(localeChunkName('E:/dev/midiremap/locales/de/app.ftl?raw')).toBe('assets/locale-de-messages-[hash].js');
  });

  it('names a locale\'s documents after its code', () => {
    expect(localeChunkName('E:\\dev\\midiremap\\locales\\ja\\docs.json')).toBe('assets/locale-ja-docs-[hash].js');
  });

  it('leaves every other chunk to the default name', () => {
    expect(localeChunkName('E:/dev/midiremap/app/src/components/EditView.tsx')).toBeUndefined();
  });

  it('leaves a chunk without a name to the default name', () => {
    expect(localeChunkName(null)).toBeUndefined();
  });
});
