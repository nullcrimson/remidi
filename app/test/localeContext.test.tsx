import { render, screen } from '@testing-library/react';
import { makeTranslator } from '../src/i18n';
import { LocaleContext, useT } from '../src/localeContext';

function Greeting() {
  const t = useT();
  return <p>{t({ id: 'nav-converter' })}</p>;
}

describe('the locale context', () => {
  it('gives English without a provider', () => {
    render(<Greeting />);
    expect(screen.getByText('Converter')).toBeInTheDocument();
  });

  it('gives the provided translator', () => {
    const tr = makeTranslator('pl', 'nav-converter = Konwerter\n', {}, ['nav-converter']);
    render(
      <LocaleContext.Provider value={{ translator: tr, switchTo: () => undefined, failed: null }}>
        <Greeting />
      </LocaleContext.Provider>,
    );
    expect(screen.getByText('Konwerter')).toBeInTheDocument();
  });
});
