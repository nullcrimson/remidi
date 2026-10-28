import { latinFont } from '../scripts/latinFonts';

describe('latin font files', () => {
  it('names its weight, variable or numeric, as a source url or an emitted file', () => {
    expect(latinFont('./files/ibm-plex-sans-latin-wght-normal.woff2')).toEqual({ weight: 'variable' });
    expect(latinFont('ibm-plex-mono-latin-400-normal-DMJ8VG8y.woff2')).toEqual({ weight: 400 });
  });

  it('is never a latin-ext file', () => {
    expect(latinFont('./files/ibm-plex-sans-latin-ext-wght-normal.woff2')).toBeUndefined();
    expect(latinFont('space-grotesk-latin-ext-wght-normal-D9tNdqV9.woff2')).toBeUndefined();
  });
});
