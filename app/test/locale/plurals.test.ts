import { ENGLISH } from '../../src/locale/i18n';

const { t } = ENGLISH;

describe('plural wording', () => {
  it('says one override', () => {
    expect(t({ id: 'chip-overrides', args: { count: 1 } })).toBe('1 override');
  });

  it('says several overrides', () => {
    expect(t({ id: 'chip-overrides', args: { count: 3 } })).toBe('3 overrides');
  });

  it('says one source drum of one has a match in the target', () => {
    expect(t({ id: 'summary-remapped', args: { remapped: 1, total: 1, source: 'GGD Invasion', target: 'EZdrummer' } })).toBe('1 of 1 GGD Invasion drum has a match in EZdrummer');
  });

  it('says how many of several source drums have a match in the target', () => {
    expect(t({ id: 'summary-remapped', args: { remapped: 9, total: 12, source: 'GGD Invasion', target: 'EZdrummer' } })).toBe('9 of 12 GGD Invasion drums have a match in EZdrummer');
  });
});
