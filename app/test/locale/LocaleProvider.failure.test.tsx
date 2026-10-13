import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '../../src/locale/LocaleProvider';
import { SiteHeader } from '../../src/site/SiteHeader';
import { ENGLISH } from '../../src/locale/i18n';
import { useLocale, useT } from '../../src/locale/localeContext';

vi.mock('../../src/locale/i18n', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/locale/i18n')>();
  return { ...real, loadTranslator: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) };
});

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

it('stays in its language and reports a locale that fails to load', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<LocaleProvider initial={ENGLISH}><Probe /></LocaleProvider>);
  await userEvent.click(screen.getByText('pl'));
  expect(await screen.findByText('pl', { selector: 'p' })).toBeInTheDocument();
  expect(screen.getByText('Converter')).toBeInTheDocument();
  expect(location.pathname).toBe('/');
});

it('tells the visitor in the header which language failed to load', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<LocaleProvider initial={ENGLISH}><SiteHeader /><Probe /></LocaleProvider>);
  await userEvent.click(screen.getByText('pl'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn\'t load Polski.');
});
