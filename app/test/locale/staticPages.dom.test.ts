import { runLocaleScript } from '../../src/locale/staticPages';

const PAGE = `
  <a data-locale="en" lang="en" href="/faq/">English</a>
  <a data-locale="pl" lang="pl" href="/pl/faq/">Polski</a>
  <div id="lang-offer" hidden>
    <a hidden data-offer="pl" data-locale="pl" lang="pl" href="/pl/faq/">Polski</a>
    <button type="button" data-dismiss>x</button>
  </div>`;

const locationStub = () => ({ replace: vi.fn() });
const offer = () => document.getElementById('lang-offer');
const offerLink = () => document.querySelector<HTMLAnchorElement>('[data-offer]');

describe('the static pages locale script', () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE;
    document.documentElement.lang = 'en';
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
    localStorage.setItem('midiremap:locale-offer', 'dismissed');
    runLocaleScript(document, ['pl'], locationStub());
    expect(offer()?.hidden).toBe(true);
  });

  it('remembers a dismissal and hides the offer', () => {
    runLocaleScript(document, ['pl'], locationStub());
    document.querySelector<HTMLElement>('[data-dismiss]')?.click();
    expect(localStorage.getItem('midiremap:locale-offer')).toBe('dismissed');
    expect(offer()?.hidden).toBe(true);
  });
});
