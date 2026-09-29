import { createContext, useContext } from 'react';
import type { Locale } from './generated/i18n';
import { ENGLISH, type Translate, type Translator } from './i18n';

export interface LocaleState {
  translator: Translator;
  switchTo: (locale: Locale) => void;
  failed: Locale | null;
}

export const LocaleContext = createContext<LocaleState>({ translator: ENGLISH, switchTo: () => undefined, failed: null });

export function useLocale(): LocaleState {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  return useContext(LocaleContext).translator.t;
}
