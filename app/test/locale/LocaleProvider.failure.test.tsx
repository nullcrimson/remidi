import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../src/locale/LocaleProvider';
import { SiteHeader } from '../../src/site/SiteHeader';
import { ENGLISH } from '../../src/locale/i18n';
import { useLocale, useT } from '../../src/locale/localeContext';

const offline = () => Promise.reject(new TypeError('Failed to fetch'));

function Offline({ children }: { children: ReactNode }) {
  return <LocaleProvider initial={ENGLISH} load={offline}>{children}</LocaleProvider>;
}

function Probe() {
  const t = useT();
  const { switchTo, failed } = useLocale();
  return (
    <>
      <p>{t({ id: 'nav-converter' })}</p>
      <button onClick={() => switchTo('pl')}>pl</button>
      <p>{failed ?? 'none'}</p>
    </>
  );
}

it('reports a locale that fails to load', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<Offline><Probe /></Offline>);
  await userEvent.click(screen.getByText('pl'));
  expect(await screen.findByText('pl', { selector: 'p' })).toBeInTheDocument();
});

it('stays in its language when a locale fails to load', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<Offline><Probe /></Offline>);
  await userEvent.click(screen.getByText('pl'));
  await screen.findByText('pl', { selector: 'p' });
  expect(screen.getByText('Converter')).toBeInTheDocument();
  expect(location.pathname).toBe('/');
});

it('tells the visitor in the header which language failed to load', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<Offline><SiteHeader /><Probe /></Offline>);
  await userEvent.click(screen.getByText('pl'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn\'t load Polski.');
});
