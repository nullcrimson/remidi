import { describe, expect, it } from 'vitest';
import { converterAddress, preselection } from '../../src/convert/preselect';
import { engineId } from '../typed';

const INVASION = engineId('ggd_invasion');
const EZDRUMMER = engineId('ezdrummer');
const ENGINES = [INVASION, EZDRUMMER].map((id) => ({ id, name: id, fullName: id }));

const read = (address: string) => {
  const { search, hash } = new URL(address);
  return preselection({ search, hash }, ENGINES);
};

describe('converterAddress', () => {
  it('names both engines chosen, as the converter reads them back', () => {
    const address = converterAddress('en', INVASION, EZDRUMMER);
    expect(address).toBe(`${location.origin}/#from=ggd_invasion&to=ezdrummer`);
    expect(read(address)).toEqual({ src: INVASION, tgt: EZDRUMMER });
  });

  it('names the one engine chosen', () => {
    expect(converterAddress('en', INVASION, null)).toBe(`${location.origin}/#from=ggd_invasion`);
    expect(read(converterAddress('en', null, EZDRUMMER))).toEqual({ tgt: EZDRUMMER });
  });

  it('is the bare converter when no engine is chosen', () => {
    expect(converterAddress('en', null, null)).toBe(`${location.origin}/`);
  });

  it('is the converter of the language the page is in', () => {
    expect(converterAddress('pl', INVASION, EZDRUMMER)).toBe(`${location.origin}/pl/#from=ggd_invasion&to=ezdrummer`);
  });
});
