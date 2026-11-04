import { readOffer, writeOffer } from '../../src/locale/localeOffer';
import { runLocaleScript } from '../../src/locale/staticPages';

const PAGE = `
  <a data-locale="en" lang="en" href="/faq/">English</a>
  <a data-locale="pl" lang="pl" href="/pl/faq/">Polski</a>
  <div id="lang-offer" hidden>
    <a hidden data-offer="pl" data-locale="pl" lang="pl" href="/pl/faq/">Polski</a>
    <button type="button" data-dismiss>x</button>
  </div>`;

const locationStub = () => ({ replace: vi.fn() });
const at = (path: string) => window.history.replaceState(null, '', path);
const offer = () => document.getElementById('lang-offer');
const offerLink = () => document.querySelector<HTMLAnchorElement>('[data-offer]');

describe('the static pages locale script', () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE;
    document.documentElement.lang = 'en';
    at('/faq/');
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('remembers the language of a clicked link', () => {
    runLocaleScript(document, [], locationStub());
    document.querySelector<HTMLElement>('a[data-locale="pl"]')?.click();
    expect(localStorage.getItem('midiremap:locale')).toBe('pl');
  });

  it('sends a visitor with a stored choice to that language page', () => {
    localStorage.setItem('midiremap:locale', 'pl');
    const location = locationStub();
    runLocaleScript(document, ['en'], location);
    expect(location.replace).toHaveBeenCalledWith(offerLink()?.href);
  });

  it('offers the browser language when the page has it', () => {
    runLocaleScript(document, ['pl-PL'], locationStub());
    expect(offer()?.hidden).toBe(false);
    expect(offerLink()?.hidden).toBe(false);
  });

  it('offers nothing when the page is already in the browser language', () => {
    runLocaleScript(document, ['en-US', 'pl'], locationStub());
    expect(offer()?.hidden).toBe(true);
  });

  it('offers nothing after the offer was dismissed', () => {
    writeOffer({ kind: 'answered' });
    runLocaleScript(document, ['pl'], locationStub());
    expect(offer()?.hidden).toBe(true);
  });

  it('remembers a dismissal', () => {
    runLocaleScript(document, ['pl'], locationStub());
    document.querySelector<HTMLElement>('[data-dismiss]')?.click();
    expect(readOffer()).toEqual({ kind: 'answered' });
  });

  it('hides the offer on a dismissal', () => {
    runLocaleScript(document, ['pl'], locationStub());
    document.querySelector<HTMLElement>('[data-dismiss]')?.click();
    expect(offer()?.hidden).toBe(true);
  });

  it('offers again on the same page while the offer is unanswered', () => {
    runLocaleScript(document, ['pl'], locationStub());
    document.body.innerHTML = PAGE;
    runLocaleScript(document, ['pl'], locationStub());
    expect(offer()?.hidden).toBe(false);
  });

  it('offers nothing on another page once the offer was left unanswered', () => {
    runLocaleScript(document, ['pl'], locationStub());
    document.body.innerHTML = PAGE;
    at('/drum-maps/');
    runLocaleScript(document, ['pl'], locationStub());
    expect(offer()?.hidden).toBe(true);
  });

  it('offers nothing after the offer was ignored', () => {
    runLocaleScript(document, ['pl'], locationStub());
    at('/drum-maps/');
    runLocaleScript(document, ['pl'], locationStub());
    at('/faq/');
    document.body.innerHTML = PAGE;
    runLocaleScript(document, ['pl'], locationStub());
    expect(offer()?.hidden).toBe(true);
  });
});
