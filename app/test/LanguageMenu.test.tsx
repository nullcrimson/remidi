import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LanguageMenu } from '../src/components/LanguageMenu';
import type { Locale } from '../src/generated/i18n';
import { ENGLISH } from '../src/i18n';
import { LocaleContext } from '../src/localeContext';

const withSwitch = (switchTo: (l: Locale) => void, ui: ReactNode) => (
  <LocaleContext.Provider value={{ translator: ENGLISH, switchTo, failed: null }}>{ui}</LocaleContext.Provider>
);

describe('LanguageMenu', () => {
  it('names each language in its own language and links to its converter', () => {
    render(<LanguageMenu />);
    const list = screen.getByRole('list', { hidden: true });
    expect(within(list).getByRole('link', { name: 'Polski', hidden: true })).toHaveAttribute('href', '/pl/');
    expect(within(list).getByRole('link', { name: 'English', hidden: true })).toHaveAttribute('aria-current', 'true');
  });

  it('shows the current code on its trigger', () => {
    render(<LanguageMenu />);
    expect(screen.getByRole('button', { name: 'Language' })).toHaveTextContent('EN');
  });

  it('switches in place on a plain click', async () => {
    const switchTo = vi.fn();
    render(withSwitch(switchTo, <LanguageMenu />));
    await userEvent.click(screen.getByRole('link', { name: 'Polski', hidden: true }));
    expect(switchTo).toHaveBeenCalledWith('pl');
  });

  it('leaves a modified click to the browser', async () => {
    const switchTo = vi.fn();
    render(withSwitch(switchTo, <LanguageMenu />));
    const user = userEvent.setup();
    await user.keyboard('{Control>}');
    await user.click(screen.getByRole('link', { name: 'Polski', hidden: true }));
    expect(switchTo).not.toHaveBeenCalled();
  });

  it('does not switch to the language already shown', async () => {
    const switchTo = vi.fn();
    render(withSwitch(switchTo, <LanguageMenu />));
    await userEvent.click(screen.getByRole('link', { name: 'English', hidden: true }));
    expect(switchTo).not.toHaveBeenCalled();
  });
});
