import { t } from '../src/i18n';

describe('plural wording', () => {
  it('says one override', () => {
    expect(t({ id: 'chip-overrides', args: { count: 1 } })).toBe('1 override');
  });

  it('says several overrides', () => {
    expect(t({ id: 'chip-overrides', args: { count: 3 } })).toBe('3 overrides');
  });

  it('says one drum remapped out of one', () => {
    expect(t({ id: 'summary-remapped', args: { remapped: 1, total: 1 } })).toBe('1 of 1 drum remapped');
  });

  it('says drums remapped out of several', () => {
    expect(t({ id: 'summary-remapped', args: { remapped: 9, total: 12 } })).toBe('9 of 12 drums remapped');
  });
});
