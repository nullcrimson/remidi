import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { LocaleProvider } from '../src/components/LocaleProvider';
import { ENGLISH } from '../src/i18n';
import { useLocale, useT } from '../src/localeContext';

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

  it('switches in place, keeps component state, updates the URL and the document', async () => {
    renderProbe();
    await userEvent.click(screen.getByText('clicked 0'));
    await userEvent.click(screen.getByText('pl'));
    expect(await screen.findByText('Konwerter')).toBeInTheDocument();
    expect(screen.getByText('clicked 1')).toBeInTheDocument();
    expect(location.pathname).toBe('/pl/');
    expect(document.documentElement.lang).toBe('pl');
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

  it('follows Back to the previous language without pushing history', async () => {
    renderProbe();
    await userEvent.click(screen.getByText('pl'));
    await screen.findByText('Konwerter');
    const length = history.length;
    await act(async () => {
      history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByText('Converter')).toBeInTheDocument();
    expect(history.length).toBe(length);
  });
});
