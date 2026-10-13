import { runLocaleScript } from '../../src/locale/staticPages';
import { fakeUmami } from '../umami';

const PAGE = `
  <a data-locale="en" lang="en" href="/faq/" aria-current="true">English</a>
  <a data-locale="pl" lang="pl" href="/pl/faq/">Polski</a>
  <div id="lang-offer" hidden>
    <a hidden data-offer="pl" data-locale="pl" lang="pl" href="/pl/faq/">Polski</a>
    <button type="button" data-dismiss>x</button>
  </div>`;

const location = { replace: vi.fn() };
const click = (selector: string) => document.querySelector<HTMLElement>(selector)?.click();

describe('the events of the static pages locale script', () => {
  const umami = fakeUmami();

  beforeEach(() => {
    document.body.innerHTML = PAGE;
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('sends language-picked with where page for a language chosen in the menu', () => {
    runLocaleScript(document, [], location);
    click('a[data-locale="pl"]:not([data-offer])');
    expect(umami).toHaveBeenCalledWith('language-picked', { to: 'pl', where: 'page' });
  });

  it('sends the event before the navigation proceeds and does not hold it back', () => {
    runLocaleScript(document, [], location);
    const press = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('a[data-locale="pl"]:not([data-offer])')?.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(false);
    expect(umami).toHaveBeenCalledTimes(1);
  });

  it('sends no language-picked for the language the page is already in', () => {
    runLocaleScript(document, [], location);
    click('a[data-locale="en"]');
    expect(umami).not.toHaveBeenCalled();
  });

  it('sends no language-picked for the offer link', () => {
    runLocaleScript(document, ['pl'], location);
    umami.mockClear();
    click('[data-offer]');
    expect(umami).not.toHaveBeenCalledWith('language-picked', expect.anything());
  });

  it('sends language-offered with the language when the page has loaded, though Umami arrived after the script ran', () => {
    delete window.umami;
    runLocaleScript(document, ['pl-PL'], location);
    window.umami = { track: umami };
    window.dispatchEvent(new Event('load'));
    expect(umami).toHaveBeenCalledWith('language-offered', { to: 'pl' });
  });

  it('shows the offer at once, before the page has loaded', () => {
    runLocaleScript(document, ['pl-PL'], location);
    expect(document.getElementById('lang-offer')?.hidden).toBe(false);
  });

  it('sends nothing for the offer until the page has loaded', () => {
    runLocaleScript(document, ['pl-PL'], location);
    expect(umami).not.toHaveBeenCalled();
  });

  it('sends no language-picked for a language link whose code is not a locale', () => {
    document.body.insertAdjacentHTML('beforeend', '<a data-locale="xx" lang="xx" href="/xx/faq/">Xx</a>');
    runLocaleScript(document, [], location);
    click('a[data-locale="xx"]');
    expect(umami).not.toHaveBeenCalled();
  });

  it('sends no language-offered when nothing is offered', () => {
    runLocaleScript(document, ['en-US'], location);
    expect(umami).not.toHaveBeenCalled();
  });

  it('sends language-offer-answered with accepted when the offer is followed', () => {
    runLocaleScript(document, ['pl'], location);
    click('[data-offer]');
    expect(umami).toHaveBeenCalledWith('language-offer-answered', { to: 'pl', answer: 'accepted' });
  });

  it('sends language-offer-answered with dismissed when the offer is dismissed', () => {
    runLocaleScript(document, ['pl'], location);
    click('[data-dismiss]');
    expect(umami).toHaveBeenCalledWith('language-offer-answered', { to: 'pl', answer: 'dismissed' });
  });
});
