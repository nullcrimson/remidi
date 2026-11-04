import { readOffer, writeOffer } from '../../src/locale/localeOffer';

describe('the stored language offer', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('reads nothing before the offer was shown', () => {
    expect(readOffer()).toBeNull();
  });

  it('reads back an offer shown on a page', () => {
    writeOffer({ kind: 'shown', to: 'pl', page: '/faq/' });
    expect(readOffer()).toEqual({ kind: 'shown', to: 'pl', page: '/faq/' });
  });

  it('reads back an answered offer', () => {
    writeOffer({ kind: 'answered' });
    expect(readOffer()).toEqual({ kind: 'answered' });
  });

  it('reads a dismissal stored before ignoring was told apart as answered', () => {
    localStorage.setItem('midiremap:locale-offer', 'dismissed');
    expect(readOffer()).toEqual({ kind: 'answered' });
  });

  it('reads nothing from a value it cannot decode', () => {
    localStorage.setItem('midiremap:locale-offer', '{"to":"xx","page":"/faq/"}');
    expect(readOffer()).toBeNull();
  });
});
