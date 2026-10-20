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
  it('links every popular conversion table, then the note maps', () => {
    render(<PopularConversions engines={ENGINES} />);
    const all = links();
    expect(all).toHaveLength(POPULAR.length + 1);
    expect([all[0].textContent, all[0].getAttribute('href')]).toEqual([
      'Name of ggd_invasion to Name of ezdrummer',
      '/convert/ggd-invasion-to-ezdrummer/',
    ]);
    expect([all[all.length - 1].textContent, all[all.length - 1].getAttribute('href')]).toEqual(['Note maps', '/engines/']);
  });

  it('heads the links', () => {
    render(<PopularConversions engines={ENGINES} />);
    expect(screen.getByRole('heading', { name: 'Popular conversions' })).toBeInTheDocument();
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
    expect(hrefs[0]).toBe('/pl/convert/ggd-invasion-to-ezdrummer/');
    expect(hrefs[hrefs.length - 1]).toBe('/pl/engines/');
  });
});
