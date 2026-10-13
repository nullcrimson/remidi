import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { LocaleProvider } from '../../src/locale/LocaleProvider';
import { ENGLISH } from '../../src/locale/i18n';
import { useLocale, useT } from '../../src/locale/localeContext';

function Probe() {
  const t = useT();
  const { switchTo, failed } = useLocale();
  const [count, setCount] = useState(0);
  return (
    <>
      <p>{t({ id: 'nav-converter' })}</p>
      <button onClick={() => setCount((c) => c + 1)}>{`clicked ${count}`}</button>
      <button onClick={() => switchTo('pl')}>pl</button>
      <button onClick={() => switchTo('en')}>en</button>
      {failed && <p role="alert">{failed}</p>}
    </>
  );
}

const renderProbe = () => render(<LocaleProvider initial={ENGLISH}><Probe /></LocaleProvider>);

describe('LocaleProvider', () => {
  afterEach(() => {
    history.replaceState(null, '', '/');
    localStorage.clear();
    vi.restoreAllMocks();
  });

  async function switchToPolish() {
    renderProbe();
    await userEvent.click(screen.getByText('clicked 0'));
    await userEvent.click(screen.getByText('pl'));
  }

  it('switches in place', async () => {
    await switchToPolish();
    expect(await screen.findByText('Konwerter')).toBeInTheDocument();
  });

  it('keeps component state across a switch', async () => {
    await switchToPolish();
    await screen.findByText('Konwerter');
    expect(screen.getByText('clicked 1')).toBeInTheDocument();
  });

  it('updates the URL on a switch', async () => {
    await switchToPolish();
    await screen.findByText('Konwerter');
    expect(location.pathname).toBe('/pl/');
  });

  it('updates the document language on a switch', async () => {
    await switchToPolish();
    await screen.findByText('Konwerter');
    expect(document.documentElement.lang).toBe('pl');
  });

  it('remembers the chosen language on a switch', async () => {
    await switchToPolish();
    await screen.findByText('Konwerter');
    expect(localStorage.getItem('midiremap:locale')).toBe('pl');
  });

  it('lets the last of two quick switches win', async () => {
    renderProbe();
    await act(async () => {
      screen.getByText('pl').click();
      screen.getByText('en').click();
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Converter')).toBeInTheDocument();
    expect(location.pathname).toBe('/');
  });

  async function backToEnglish() {
    renderProbe();
    await userEvent.click(screen.getByText('pl'));
    await screen.findByText('Konwerter');
    const length = history.length;
    await act(async () => {
      history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    return length;
  }

  it('follows Back to the previous language', async () => {
    await backToEnglish();
    expect(await screen.findByText('Converter')).toBeInTheDocument();
  });

  it('does not push history when following Back', async () => {
    const length = await backToEnglish();
    await screen.findByText('Converter');
    expect(history.length).toBe(length);
  });
});
