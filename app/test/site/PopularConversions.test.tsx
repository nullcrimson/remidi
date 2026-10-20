import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PopularConversions } from '../../src/site/PopularConversions';
import { loadTranslator } from '../../src/locale/i18n';
import { LocaleContext } from '../../src/locale/localeContext';
import { POPULAR } from '../../src/generated/i18n';
import { engineId } from '../typed';

const named = (id: string) => ({ id: engineId(id), name: `Name of ${id}`, fullName: `Name of ${id}` });
const ENGINES = [...new Set(POPULAR.flat())].map(named);

const links = () => within(screen.getByRole('navigation', { name: 'Popular conversions' })).getAllByRole('link');

describe('PopularConversions', () => {
  it('links every popular conversion table in order', () => {
    render(<PopularConversions engines={ENGINES} />);
    const all = links();
    expect(all).toHaveLength(POPULAR.length);
    expect([all[0].textContent, all[0].getAttribute('href')]).toEqual([
      'Name of ggd_invasion to Name of ezdrummer',
      '/convert/ggd-invasion-to-ezdrummer/',
    ]);
  });

  it('folds the links under a closed summary', () => {
    const { container } = render(<PopularConversions engines={ENGINES} />);
    const details = container.querySelector('details');
    expect(details?.open).toBe(false);
    expect(details?.querySelector('summary')).toHaveTextContent('Popular conversions');
  });

  it('skips a conversion whose engine is not loaded', () => {
    render(<PopularConversions engines={ENGINES.filter((e) => e.id !== 'bfd3')} />);
    expect(links().map((l) => l.getAttribute('href'))).not.toContain('/convert/bfd3-to-superior-drummer3/');
  });

  it('renders nothing before the engines load', () => {
    const { container } = render(<PopularConversions engines={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links the conversion tables in the page language', async () => {
    const pl = await loadTranslator('pl');
    render(
      <LocaleContext.Provider value={{ translator: pl, switchTo: () => undefined, failed: null }}>
        <PopularConversions engines={ENGINES} />
      </LocaleContext.Provider>,
    );
    const nav = screen.getByRole('navigation', { name: pl.t({ id: 'maps-popular' }) });
    const hrefs = within(nav).getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs.every((h) => h?.startsWith('/pl/convert/'))).toBe(true);
  });
});
